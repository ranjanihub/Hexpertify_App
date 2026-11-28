import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  UserCheck,
  CheckCircle2,
  Star,
  Users,
  ShieldCheck,
  X,
  UserPlus,
  Plus,
  Minus,
  ArrowLeft,
  DollarSign,
  Trash2,
  AlertCircle,
  Briefcase,
  Award,
  HelpCircle,
  Globe,
  FileText,
  Sparkles,
  RefreshCw,
  Eye,
  Code,
  Image as ImageIcon,
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
  ListOrdered,
  CheckSquare,
  EyeOff,
  MoreVertical,
  Archive,
  CalendarOff,
  Pencil,
  ExternalLink,
  Building2
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { launchConsultantPanel } from '../lib/auth';
import { api } from '../lib/apiClient';
import { ImageUploadButton } from '../components/common/ImageUploadButton';
import { sanitizeRichHtml } from '../lib/rich-text';
import { useUrlSearch } from '../lib/global-search';
import type {
  Therapist,
  Client,
  TherapistServiceItem,
  TherapistReviewItem,
  TherapistFAQItem
} from '../types';

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

    // Reposition cursor and refocus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selectedText || after).length);
    }, 0);
  };

  return (
    <div className="w-full border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs focus-within:border-[#450bc8] focus-within:ring-1 focus-within:ring-[#450bc8]/10 transition-all">
      {/* Editor toolbar */}
      <div className="bg-slate-50 border-b border-slate-150 px-4 py-2.5 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => insertText('**', '**')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('*', '*')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('~~', '~~')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={() => insertText('<h2>', '</h2>')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold font-mono"
            title="Heading"
          >
            <Heading className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('<hr />')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-[9px] font-extrabold text-slate-500 hover:text-slate-800 transition-colors"
            title="Horizontal Rule"
          >
            HR
          </button>
          <button
            type="button"
            onClick={() => insertText('<a href="https://example.com" target="_blank">', '</a>')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
            title="Hyperlink"
          >
            <Link className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('<blockquote>', '</blockquote>')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('<code>', '</code>')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
            title="Code Block"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText(`<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Physician",\n  "name": "Dr. John Doe"\n}\n</script>`)}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
            title="Insert Structured Data JSON-LD Template"
          >
            <Braces className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('<!-- ', ' -->')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
            title="Comment Block"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('<img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600" alt="Consultant Profile" className="w-full rounded-2xl border" />')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
            title="Insert Image Tag"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('<table className="min-w-full divide-y divide-slate-200">\n  <thead>\n    <tr><th>Header 1</th><th>Header 2</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>Value 1</td><td>Value 2</td></tr>\n  </tbody>\n</table>')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
            title="Table"
          >
            <Table className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={() => insertText('<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('<ol>\n  <li>First Item</li>\n  <li>Second Item</li>\n</ol>')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('<div className="flex items-center gap-2">\n  <input type="checkbox" checked disabled />\n  <span>Task description</span>\n</div>')}
            disabled={isPreview}
            className="p-1.5 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
            title="Checklist"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
            isPreview
              ? 'bg-[#450bc8] text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>{isPreview ? 'Editing' : 'Preview'}</span>
        </button>
      </div>

      {/* Editor text space / visual sandbox */}
      <div className="bg-slate-50/50">
        {isPreview ? (
          <div className="p-4 min-h-[180px] text-slate-800 bg-white text-xs border-none font-medium overflow-y-auto leading-relaxed">
            {value.trim() ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value) }} />
            ) : (
              <span className="text-slate-400 italic">No output to preview. Write custom code tags to see them rendered here.</span>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            rows={7}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[180px] p-4 bg-white text-sm font-mono text-slate-800 border-none outline-none resize-y block focus:ring-0"
          />
        )}
      </div>

      {/* Bottom info/helper bar */}
      {helperText && (
        <div className="bg-slate-50/50 border-t border-slate-150 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>{helperText}</span>
          <span className="font-mono">{value.length} characters</span>
        </div>
      )}
    </div>
  );
};

/** A blank Create Consultant form: nothing is pre-filled that could be published by mistake */
const emptyTherapistForm = () => ({
  name: '',
  email: '',
  identifier: '',
  sequence: '1',
  notificationTitle: '',
  profession: '',
  professionId: '',
  photo: '',
  photoAltText: '',
  about: '',
  experienceYears: '0',
  clientsServed: '0',
  isCertified: false,
  youtubeUrl: '',
  languages: ['English'],
  specialties: [] as string[],
  qualifications: [] as string[],
  certificates: [] as { name: string; url: string }[],
  platformFeePerSession: '500',
  platformFeeType: 'Fixed' as 'Fixed' | 'Percentage',
  services: [] as TherapistServiceItem[],
  reviews: [] as TherapistReviewItem[],
  faqs: [] as TherapistFAQItem[],
  bankName: '',
  bankAccountNumber: '',
  bankIfsc: '',
  accountHolderName: '',
  upiId: '',
  seo: {
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    canonicalUrl: '',
    ogTitle: '',
    ogDescription: '',
    ogImageUrl: '',
    ogImageAltText: '',
    structuredData: '',
    htmlChunk: ''
  }
});

const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The default title saved when the admin leaves the meta title empty (the preview shows exactly this) */
const defaultSeoTitle = (name: string, profession: string) => `${name.trim()} | ${profession || 'Therapist'}`;
/** The default description saved when the admin leaves it empty (the preview shows exactly this) */
const defaultSeoDescription = (name: string, about: string) =>
  about.trim() ? `${about.trim().slice(0, 150)}${about.trim().length > 150 ? '...' : ''}` : (name.trim() ? `Book sessions with ${name.trim()} on Hexpertify.` : '');

interface TherapistsViewProps {
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

type SectionKey = 'basic' | 'details' | 'credentials' | 'services' | 'reviews' | 'faqs' | 'banking' | 'seo';

export const TherapistsView: React.FC<TherapistsViewProps> = ({
  isAddModalOpen: isAddModalProp = false,
  onCloseAddModal
}) => {
  const { therapists, deleteTherapist, refreshAllData, addAuditLog } = useAppContext();
  // Create / edit save in progress (the ref blocks a second submit before React re-renders)
  const savingRef = React.useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [therapistsList, setTherapistsList] = useState<Therapist[]>(therapists);
  const [searchTerm, setSearchTerm] = useState('');
  // Opened from the admin search (e.g. ?q=CL-00001): filter to that record
  useUrlSearch(setSearchTerm);
  const [selectedProfession, setSelectedProfession] = useState<string>('All');
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);

  // Outcome scores calculated by the API from real sessions, homework, goals and assessments (null = no data yet)
  type OutcomeScores = {
    improvementScore: number | null;
    goalAchievementRate: number | null;
    homeworkAdherenceRate: number | null;
    attendanceRate: number | null;
    basis: {
      sessionsCompleted: number; sessionsMissed: number; activitiesAssigned: number; activitiesCompleted: number;
      goals: number; goalsAchieved: number; assessmentPairs: number;
    };
  };
  const [outcomeScores, setOutcomeScores] = useState<OutcomeScores | null>(null);
  const [outcomesState, setOutcomesState] = useState<'idle' | 'loading' | 'error'>('idle');
  const selectedTherapistId = selectedTherapist?.id;
  useEffect(() => {
    setOutcomeScores(null);
    if (!selectedTherapistId) return;
    let cancelled = false;
    setOutcomesState('loading');
    fetch(`/api/admin/consultants/${encodeURIComponent(selectedTherapistId)}/outcomes`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok && data?.success) {
          setOutcomeScores(data.outcomes);
          setOutcomesState('idle');
        } else {
          setOutcomesState('error');
        }
      })
      .catch(() => !cancelled && setOutcomesState('error'));
    return () => {
      cancelled = true;
    };
  }, [selectedTherapistId]);
  const [showClientsWorkspaceModal, setShowClientsWorkspaceModal] = useState(false);
  const [activeClientInWorkspace, setActiveClientInWorkspace] = useState<Client | null>(null);
  const [isAddModalInternalOpen, setIsAddModalInternalOpen] = useState(false);

  React.useEffect(() => {
    if (therapists && therapists.length > 0) {
      setTherapistsList(therapists);
    }
  }, [therapists]);

  // Professions the public website lists (Profession collection)
  const [professions, setProfessions] = useState<{ id: string; name: string }[]>([]);
  React.useEffect(() => {
    api.get('/api/admin/professions')
      .then((data: any) => {
        const list = Array.isArray(data?.professions) ? data.professions : [];
        setProfessions(
          list
            .map((p: any) => ({ id: String(p.id || p._id || ''), name: String(p.name || p.serviceName || '') }))
            .filter((p: { id: string; name: string }) => p.id && p.name)
        );
      })
      .catch((err) => console.error('Could not load professions:', err));
  }, []);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  // Failures (e.g. a delete the server refused) show in red, not as a success
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>('basic');
  const [previewTab, setPreviewTab] = useState<'search' | 'social' | 'html'>('search');
  const [editingTherapistId, setEditingTherapistId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [editingFAQId, setEditingFAQId] = useState<string | null>(null);

  // Form State for Create / Add Consultant
  const [formData, setFormData] = useState(emptyTherapistForm);

  const handleOpenCreateModal = () => {
    setEditingTherapistId(null);
    setFormData(emptyTherapistForm());
    setActiveSection('basic');
    setIsAddModalInternalOpen(true);
  };

  const handleStartEdit = (t: Therapist) => {
    setEditingTherapistId(t.id);
    setFormData({
      name: t.name || '',
      email: t.email || '',
      identifier: t.identifier || '',
      sequence: t.sequence !== undefined && t.sequence !== null ? String(t.sequence) : '',
      notificationTitle: t.notificationTitle || '',
      profession: t.profession || '',
      professionId:
        t.professionId ||
        professions.find((p) => p.name.toLowerCase() === String(t.profession || '').toLowerCase())?.id ||
        '',
      photo: t.photo || '',
      photoAltText: t.photoAltText || '',
      about: t.about || t.bio || '',
      experienceYears: String(t.experienceYears || 0),
      clientsServed: String(t.clientsServed || 0),
      isCertified: Boolean(t.isCertified),
      youtubeUrl: t.youtubeUrl || '',
      languages: Array.isArray(t.languages) ? t.languages : [],
      specialties: Array.isArray(t.specializations) ? t.specializations : [],
      qualifications: Array.isArray(t.qualifications) ? t.qualifications : [],
      certificates: (t.certificates || []).map((c) => {
        if (typeof c === 'string') {
          return { name: '', url: c };
        }
        return { name: c.name || '', url: c.url || '' };
      }),
      // The platform fee (not the session price): read it back from the first plan, which stores the computed fee
      platformFeePerSession: String((() => {
        const plan = (t.services || []).find((s) => Number(s?.sessionFee) > 0 && Number.isFinite(Number(s?.platformFee)));
        if (plan) {
          return t.platformFeeType === 'Percentage'
            ? Math.round((Number(plan.platformFee) / Number(plan.sessionFee)) * 100)
            : Number(plan.platformFee);
        }
        return t.platformFeePerSession ?? 500;
      })()),
      platformFeeType: t.platformFeeType || 'Fixed',
      services: t.services || [],
      reviews: t.reviews || [],
      faqs: t.faqs || [],
      bankName: t.bankName || '',
      bankAccountNumber: t.bankAccountNumber || '',
      bankIfsc: t.bankIfsc || '',
      accountHolderName: t.accountHolderName || '',
      upiId: t.upiId || '',
      seo: {
        metaTitle: t.seo?.metaTitle || '',
        metaDescription: t.seo?.metaDescription || '',
        keywords: t.seo?.keywords || '',
        canonicalUrl: t.seo?.canonicalUrl || '',
        ogTitle: t.seo?.ogTitle || '',
        ogDescription: t.seo?.ogDescription || '',
        ogImageUrl: t.seo?.ogImageUrl || '',
        ogImageAltText: t.seo?.ogImageAltText || '',
        structuredData: t.seo?.structuredData || '',
        htmlChunk: t.seo?.htmlChunk || ''
      }
    });
    setActiveSection('basic');
    setIsAddModalInternalOpen(true);
  };

  // Sync external add modal prop
  const isAddModalOpen = isAddModalProp || isAddModalInternalOpen;

  // "Add Therapist" from the header opens a blank Create form, never one still holding an edited therapist
  React.useEffect(() => {
    if (!isAddModalProp) return;
    setEditingTherapistId(null);
    setFormData(emptyTherapistForm());
    setValidationError(null);
    setActiveSection('basic');
  }, [isAddModalProp]);

  const handleCloseAddModal = () => {
    setIsAddModalInternalOpen(false);
    setValidationError(null);
    setEditingTherapistId(null);
    if (onCloseAddModal) {
      onCloseAddModal();
    }
  };

  // Close modal on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAddModalOpen) {
        handleCloseAddModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen]);

  // State for inline sub-forms in modal (Services, Reviews, FAQs)
  const [newFAQ, setNewFAQ] = useState({
    question: '',
    answer: ''
  });
  const [showAddFAQForm, setShowAddFAQForm] = useState(false);

  const handleNameChange = (val: string) => {
    const slugOf = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = slugOf(val);
    setFormData((prev) => ({
      ...prev,
      name: val,
      // A new profile's identifier follows the name until the admin types their own; an existing one never changes here
      identifier: !editingTherapistId && (!prev.identifier || prev.identifier === slugOf(prev.name)) ? slug : prev.identifier
      // The email is never derived from the name: the admin enters the therapist's real address
    }));
  };

  const scrollToSection = (sectionKey: SectionKey, _id?: string) => {
    setActiveSection(sectionKey);
  };

  const handleNextStep = () => {
    const steps: SectionKey[] = ['basic', 'details', 'credentials', 'services', 'reviews', 'faqs', 'banking', 'seo'];
    const currentIndex = steps.indexOf(activeSection);
    
    // Simple validation on step change
    if (activeSection === 'basic') {
      if (!formData.name.trim()) {
        scrollToSection('basic');
        setValidationError('Please enter the Consultant Name.');
        return;
      }
      if (!formData.profession.trim()) {
        scrollToSection('basic');
        setValidationError('Please select or enter a Profession.');
        return;
      }
      if (!VALID_EMAIL.test(formData.email.trim())) {
        scrollToSection('basic');
        setValidationError("Please enter the therapist's real email address.");
        return;
      }
    }

    setValidationError(null);
    if (currentIndex < steps.length - 1) {
      setActiveSection(steps[currentIndex + 1]);
    }
  };

  const handlePrevStep = () => {
    const steps: SectionKey[] = ['basic', 'details', 'credentials', 'services', 'reviews', 'faqs', 'banking', 'seo'];
    const currentIndex = steps.indexOf(activeSection);
    setValidationError(null);
    if (currentIndex > 0) {
      setActiveSection(steps[currentIndex - 1]);
    }
  };

  const handleAddLanguage = () => {
    setFormData((prev) => ({ ...prev, languages: [...prev.languages, ''] }));
  };

  const handleUpdateLanguage = (index: number, val: string) => {
    const updated = [...formData.languages];
    updated[index] = val;
    setFormData({ ...formData, languages: updated });
  };

  const handleRemoveLanguage = (index: number) => {
    setFormData({
      ...formData,
      languages: formData.languages.filter((_, i) => i !== index)
    });
  };

  const handleAddSpecialty = () => {
    setFormData((prev) => ({ ...prev, specialties: [...prev.specialties, ''] }));
  };

  const handleUpdateSpecialty = (index: number, val: string) => {
    const updated = [...formData.specialties];
    updated[index] = val;
    setFormData({ ...formData, specialties: updated });
  };

  const handleRemoveSpecialty = (index: number) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter((_, i) => i !== index)
    });
  };

  const handleAddQualification = () => {
    setFormData((prev) => ({ ...prev, qualifications: [...prev.qualifications, ''] }));
  };

  const handleUpdateQualification = (index: number, val: string) => {
    const updated = [...formData.qualifications];
    updated[index] = val;
    setFormData({ ...formData, qualifications: updated });
  };

  const handleRemoveQualification = (index: number) => {
    setFormData({
      ...formData,
      qualifications: formData.qualifications.filter((_, i) => i !== index)
    });
  };

  const handleAddCertificate = () => {
    setFormData((prev) => ({
      ...prev,
      certificates: [...prev.certificates, { name: '', url: '' }]
    }));
  };

  const handleUpdateCertificateName = (index: number, name: string) => {
    const updated = [...formData.certificates];
    updated[index] = { ...updated[index], name };
    setFormData({ ...formData, certificates: updated });
  };

  const handleUpdateCertificateUrl = (index: number, url: string) => {
    const updated = [...formData.certificates];
    updated[index] = { ...updated[index], url };
    setFormData({ ...formData, certificates: updated });
  };

  const handleRemoveCertificate = (index: number) => {
    setFormData({
      ...formData,
      certificates: formData.certificates.filter((_, i) => i !== index)
    });
  };

  const calculateServicePlatformFee = (
    sessionFee: number,
    feeValStr: string,
    feeType: 'Fixed' | 'Percentage'
  ): number => {
    let feeNum = Number(feeValStr) || 0;
    if (feeType === 'Percentage') {
      feeNum = Math.min(100, Math.max(0, feeNum));
      return Math.round((sessionFee * feeNum) / 100);
    }
    return feeNum;
  };

  const handlePlatformFeeChange = (valStr: string, typeVal: 'Fixed' | 'Percentage') => {
    let sanitizedVal = valStr;
    if (typeVal === 'Percentage') {
      const num = Number(valStr);
      if (!isNaN(num) && num > 100) {
        sanitizedVal = '100';
      }
    }

    setFormData((prev) => {
      const updatedServices = prev.services.map((srv) => ({
        ...srv,
        platformFee: calculateServicePlatformFee(srv.sessionFee, sanitizedVal, typeVal)
      }));
      return {
        ...prev,
        platformFeePerSession: sanitizedVal,
        platformFeeType: typeVal,
        services: updatedServices
      };
    });
  };

  const handleAddService = () => {
    const defaultFee = 2000;
    const computedPlatformFee = calculateServicePlatformFee(
      defaultFee,
      formData.platformFeePerSession,
      formData.platformFeeType as 'Fixed' | 'Percentage'
    );
    const item: TherapistServiceItem = {
      id: `srv-${Date.now()}`,
      serviceName: '',
      platform: 'Google Meet',
      sessionFee: defaultFee,
      durationMinutes: 60,
      sessions: 1,
      platformFee: computedPlatformFee,
      description: ''
    };
    setFormData((prev) => ({
      ...prev,
      services: [...prev.services, item]
    }));
  };

  const handleUpdateServiceField = (id: string, field: keyof TherapistServiceItem, val: any) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.map((srv) => {
        if (srv.id === id) {
          let platformFee = srv.platformFee;
          if (field === 'sessionFee') {
            const fee = Number(val) || 0;
            platformFee = calculateServicePlatformFee(
              fee,
              prev.platformFeePerSession,
              prev.platformFeeType as 'Fixed' | 'Percentage'
            );
          }
          return { ...srv, [field]: val, platformFee };
        }
        return srv;
      })
    }));
  };

  const handleAddReview = () => {
    const item: TherapistReviewItem = {
      id: `rev-${Date.now()}`,
      clientName: '',
      clientTitle: '',
      rating: 5,
      comment: '',
      date: new Date().toISOString().split('T')[0],
      images: []
    };
    setFormData((prev) => ({
      ...prev,
      reviews: [...prev.reviews, item]
    }));
  };

  const handleUpdateReviewField = (id: string, field: keyof TherapistReviewItem, val: any) => {
    setFormData((prev) => ({
      ...prev,
      reviews: prev.reviews.map((rev) => (rev.id === id ? { ...rev, [field]: val } : rev))
    }));
  };

  const handleAddReviewImage = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      reviews: prev.reviews.map((rev) => {
        if (rev.id === id) {
          const images = rev.images || [];
          return { ...rev, images: [...images, ''] };
        }
        return rev;
      })
    }));
  };

  const handleUpdateReviewImage = (id: string, imgIdx: number, val: string) => {
    setFormData((prev) => ({
      ...prev,
      reviews: prev.reviews.map((rev) => {
        if (rev.id === id) {
          const images = [...(rev.images || [])];
          images[imgIdx] = val;
          return { ...rev, images };
        }
        return rev;
      })
    }));
  };

  const handleRemoveReviewImage = (id: string, imgIdx: number) => {
    setFormData((prev) => ({
      ...prev,
      reviews: prev.reviews.map((rev) => {
        if (rev.id === id) {
          const images = (rev.images || []).filter((_, i) => i !== imgIdx);
          return { ...rev, images };
        }
        return rev;
      })
    }));
  };

  const handleRemoveReview = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      reviews: prev.reviews.filter((r) => r.id !== id)
    }));
  };

  const handleSaveFAQ = () => {
    if (!newFAQ.question || !newFAQ.answer) return;
    const item: TherapistFAQItem = {
      id: `faq-${Date.now()}`,
      question: newFAQ.question,
      answer: newFAQ.answer
    };
    setFormData({ ...formData, faqs: [...formData.faqs, item] });
    setNewFAQ({ question: '', answer: '' });
    setShowAddFAQForm(false);
  };

  const handleRemoveFAQ = (faqId: string) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((f) => f.id !== faqId)
    }));
  };

  const handleUpdateFAQField = (faqId: string, field: 'question' | 'answer', val: string) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.map((f) => (f.id === faqId ? { ...f, [field]: val } : f))
    }));
  };

  const handleAddTherapistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // One save at a time: a double click never sends a second request
    if (savingRef.current) return;
    if (!formData.name.trim()) {
      scrollToSection('basic', 'sec-basic');
      setValidationError('Please enter the Consultant Name.');
      return;
    }
    if (!formData.profession.trim()) {
      scrollToSection('basic', 'sec-basic');
      setValidationError('Please select or enter a Profession.');
      return;
    }
    if (!VALID_EMAIL.test(formData.email.trim())) {
      scrollToSection('basic', 'sec-basic');
      setValidationError("Please enter the therapist's real email address.");
      return;
    }

    setValidationError(null);

    const original = editingTherapistId ? therapistsList.find((t) => t.id === editingTherapistId) : undefined;
    // The name is saved exactly as the admin typed it
    const displayName = formData.name.trim();
    const slug = formData.identifier || displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const selectedProfession = professions.find((p) => p.id === formData.professionId);
    const professionName = selectedProfession?.name || formData.profession;

    const payload: Record<string, any> = {
      name: displayName,
      email: formData.email.trim().toLowerCase(),
      identifier: slug,
      sequence: formData.sequence.trim() === '' ? null : Number(formData.sequence),
      // No stock photo: without a photo the website shows a profile icon
      photo: formData.photo.trim(),
      photoAltText: formData.photoAltText.trim() || `Photo of ${displayName}`,
      profession: professionName,
      qualifications: formData.qualifications.filter((q) => q.trim().length > 0),
      // A certificate is its file URL; the name is optional
      certificates: formData.certificates
        .filter((c) => c.url.trim().length > 0)
        .map((c) => ({ name: c.name.trim(), url: c.url.trim() })),
      experienceYears: parseInt(formData.experienceYears, 10) || 0,
      clientsServed: parseInt(formData.clientsServed, 10) || 0,
      isCertified: formData.isCertified,
      youtubeUrl: formData.youtubeUrl.trim(),
      languages: formData.languages.filter((l) => l.trim().length > 0),
      about: formData.about.trim(),
      specializations: formData.specialties.filter((s) => s.trim().length > 0),
      // The platform fee rule the admin entered (₹ per session or %), not the session price
      platformFeePerSession: Number(formData.platformFeePerSession) || 0,
      platformFeeType: formData.platformFeeType,
      services: formData.services,
      // Reviews written by signed-in clients stay as they are; only the admin's own reviews are sent
      reviews: formData.reviews.filter((r) => !r.isVerifiedClient && !r.verified && !r.clientId),
      faqs: formData.faqs,
      seo: {
        metaTitle: formData.seo.metaTitle || defaultSeoTitle(displayName, professionName),
        metaDescription: formData.seo.metaDescription || defaultSeoDescription(displayName, formData.about),
        keywords: formData.seo.keywords || `${professionName}, therapy`,
        canonicalUrl: formData.seo.canonicalUrl.trim(),
        ogTitle: formData.seo.ogTitle || formData.seo.metaTitle || defaultSeoTitle(displayName, professionName),
        ogDescription: formData.seo.ogDescription || formData.seo.metaDescription || defaultSeoDescription(displayName, formData.about),
        ogImageUrl: formData.seo.ogImageUrl || formData.photo,
        ogImageAltText: formData.seo.ogImageAltText || `Photo of ${displayName}`,
        structuredData: formData.seo.structuredData,
        htmlChunk: formData.seo.htmlChunk
      }
    };
    if (selectedProfession) payload.professionId = selectedProfession.id;

    // A default notification title only when none is stored and the admin left it empty
    const notificationTitle = formData.notificationTitle.trim();
    if (notificationTitle) payload.notificationTitle = notificationTitle;
    else if (original?.notificationTitle) payload.notificationTitle = '';
    else payload.notificationTitle = `${displayName} - ${professionName}`;

    // Bank details are sent only when entered or edited, so saving never replaces them with placeholders
    const bankFields = {
      bankName: formData.bankName.trim(),
      bankAccountNumber: formData.bankAccountNumber.trim(),
      bankIfsc: formData.bankIfsc.trim().toUpperCase(),
      accountHolderName: formData.accountHolderName.trim(),
      upiId: formData.upiId.trim()
    };
    (Object.keys(bankFields) as (keyof typeof bankFields)[]).forEach((k) => {
      const before = String(original?.[k] || '').trim();
      const unchanged = k === 'bankIfsc' ? before.toUpperCase() === bankFields[k] : before === bankFields[k];
      if (!unchanged) payload[k] = bankFields[k];
    });

    // Verification is the admin's explicit "Certified" choice, never automatic: a new profile is Verified only when
    // the box is ticked, and an edit changes the status only when the admin changed the box.
    const certificationChanged = !original || Boolean(original.isCertified) !== formData.isCertified;
    if (certificationChanged) {
      payload.verificationStatus = formData.isCertified ? 'Verified' : 'Pending';
    }
    if (!editingTherapistId) {
      payload.accountStatus = 'Active';
    }

    savingRef.current = true;
    setIsSaving(true);
    try {
      if (editingTherapistId) {
        const data = await api.put('/api/admin/consultants', { ...payload, id: editingTherapistId });
        const saved = data?.consultant;
        setTherapistsList((prev) =>
          prev.map((t) => (t.id === editingTherapistId ? ({
            ...t,
            ...payload,
            id: t.id,
            bio: payload.about,
            reviews: saved?.reviews || t.reviews,
            services: saved?.services || payload.services
          } as Therapist) : t))
        );
        setSuccessToast(`${displayName} saved. Changes are live on the website.`);
      } else {
        const data = await api.post('/api/admin/consultants', payload);
        const saved = data?.consultant;
        if (saved) {
          const savedId = String(saved.id || saved._id);
          setTherapistsList((prev) => [{ ...saved, id: savedId } as Therapist, ...prev.filter((t) => t.id !== savedId)]);
        }
        setSuccessToast(`${displayName} added. Their profile is live on the website.`);
      }
    } catch (err: any) {
      console.error('Error saving consultant in DB:', err);
      // Keep the form open so nothing the admin entered is lost
      setValidationError(`Not saved: ${err?.message || 'the server could not save'}`);
      return;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
    if (certificationChanged && (original || formData.isCertified)) {
      addAuditLog(
        `${formData.isCertified ? 'Verified (certified)' : 'Removed verification for'} Consultant ${displayName}`,
        'Therapists'
      );
    }
    refreshAllData();
    setTimeout(() => setSuccessToast(null), 5000);

    // Reset form state
    setFormData(emptyTherapistForm());
    handleCloseAddModal();
  };

  const uniqueProfessions = Array.from(
    new Set([
      ...professions.map((p) => p.name),
      ...therapistsList.map((t) => t.profession)
    ].filter(Boolean))
  );

  const filteredTherapists = therapistsList.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.profession.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProfession =
      selectedProfession === 'All' || t.profession === selectedProfession;
    return matchesSearch && matchesProfession;
  });

  /** Saves one visibility flag; the card changes and the success message shows only after the server confirms */
  const saveTherapistFlag = async (
    therapistId: string,
    key: 'isHiddenFromLive' | 'isBookingGreyedOut' | 'isArchived',
    messages: (name: string, on: boolean) => string,
    failure: string
  ) => {
    const target = therapistsList.find((t) => t.id === therapistId);
    const nextState = target ? !target[key] : true;
    try {
      await api.put('/api/admin/consultants', { id: therapistId, [key]: nextState });
    } catch (err: any) {
      console.error(`Error saving ${key}:`, err);
      setErrorToast(`${failure} ${err?.message || 'Please try again.'}`);
      setTimeout(() => setErrorToast(null), 6000);
      return;
    }
    setTherapistsList((prev) => prev.map((t) => (t.id === therapistId ? { ...t, [key]: nextState } : t)));
    if (target) {
      setSuccessToast(messages(target.name, nextState));
      setTimeout(() => setSuccessToast(null), 4000);
      setSelectedTherapist((prev) => (prev?.id === therapistId ? { ...prev, [key]: nextState } : prev));
    }
  };

  const handleToggleHideFromLive = (therapistId: string) =>
    saveTherapistFlag(
      therapistId,
      'isHiddenFromLive',
      (name, on) => (on ? `${name}'s profile is now hidden from live.` : `${name}'s profile is now visible on live.`),
      'The hide-from-live change was not saved.'
    );

  const handleToggleBookingGreyOut = (therapistId: string) =>
    saveTherapistFlag(
      therapistId,
      'isBookingGreyedOut',
      (name, on) => (on ? `Booking grey out enabled for ${name}.` : `Booking grey out disabled for ${name}.`),
      'The booking grey-out change was not saved.'
    );

  const handleToggleArchive = (therapistId: string) =>
    saveTherapistFlag(
      therapistId,
      'isArchived',
      (name, on) => (on ? `${name}'s profile has been archived.` : `${name}'s profile has been unarchived.`),
      'The archive change was not saved.'
    );

  const handleDeleteTherapist = async (therapistId: string) => {
    const target = therapistsList.find((t) => t.id === therapistId) || therapists?.find((t) => t.id === therapistId);
    const targetName = target?.name || 'Therapist';

    // Removed from the list only after the server confirms the delete (it refuses therapists with bookings or clients)
    try {
      await deleteTherapist(therapistId);
      setTherapistsList((prev) => prev.filter((t) => t.id !== therapistId));
      if (selectedTherapist?.id === therapistId) {
        setSelectedTherapist(null);
      }
      setSuccessToast(`Therapist ${targetName} deleted.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Error deleting consultant:', err);
      // Not deleted: say why (e.g. the therapist has bookings or assigned clients)
      setErrorToast(`Could not delete ${targetName}. ${err?.message || 'Please try again.'}`);
      setTimeout(() => setErrorToast(null), 9000);
    }
  };

  /** Average of the therapist's reviews; null when there are none (no unearned score) */
  const getTherapistAverageRating = (therapist: Therapist): number | null => {
    if (therapist.reviews && therapist.reviews.length > 0) {
      const total = therapist.reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
      const avg = total / therapist.reviews.length;
      return Math.round(avg * 10) / 10;
    }
    return Number(therapist.reviewCount) > 0 && Number(therapist.rating) > 0 ? Number(therapist.rating) : null;
  };

  // The selected therapist's clients, as the server assigns them (by the therapist's id)
  const [assignedClients, setAssignedClients] = useState<Client[]>([]);
  const [assignedClientsState, setAssignedClientsState] = useState<'idle' | 'loading' | 'error'>('idle');
  useEffect(() => {
    setAssignedClients([]);
    if (!selectedTherapistId) return;
    let cancelled = false;
    setAssignedClientsState('loading');
    api.get(`/api/admin/users?therapistId=${encodeURIComponent(selectedTherapistId)}`)
      .then((data: any) => {
        if (cancelled) return;
        const list: any[] = Array.isArray(data?.users) ? data.users : [];
        setAssignedClients(list.map((u: any) => ({
          id: String(u.id || u._id),
          clientNumber: u.clientNumber || undefined,
          name: u.name || u.email || 'Client',
          email: u.email || '',
          phone: u.phoneNumber || u.phone || '',
          avatar: u.image || u.avatarUrl || undefined,
          status: /^(inactive|suspended|blocked|deleted|disabled)$/i.test(String(u.status || '')) ? 'Inactive'
            : /^completed$/i.test(String(u.status || '')) ? 'Completed' : 'Active',
          service: u.service || '',
          assignedTherapistId: u.assignedTherapistId || undefined,
          assignedTherapistName: u.assignedTherapistName || ''
        }) as Client));
        setAssignedClientsState('idle');
      })
      .catch(() => !cancelled && setAssignedClientsState('error'));
    return () => {
      cancelled = true;
    };
  }, [selectedTherapistId]);

  const tabLabels: { key: SectionKey; label: string; sectionId: string }[] = [
    { key: 'basic', label: 'Basic Info', sectionId: 'sec-basic' },
    { key: 'details', label: 'Details', sectionId: 'sec-details' },
    { key: 'credentials', label: 'Credentials', sectionId: 'sec-credentials' },
    { key: 'services', label: 'Services', sectionId: 'sec-services' },
    { key: 'reviews', label: 'Reviews', sectionId: 'sec-reviews' },
    { key: 'faqs', label: 'FAQs', sectionId: 'sec-faqs' },
    { key: 'banking', label: 'Banking & Payout', sectionId: 'sec-banking' },
    { key: 'seo', label: 'SEO', sectionId: 'sec-seo' }
  ];

  return (
    <div className="space-y-8 pb-12 animate-fade-in relative">
      {/* Toast Notification */}
      {errorToast && (
        <div role="alert" className="fixed top-24 right-8 z-50 max-w-md bg-rose-600 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3 border border-rose-500 animate-fade-in">
          <AlertCircle className="w-6 h-6 text-white shrink-0" />
          <span className="font-bold text-xs leading-relaxed">{errorToast}</span>
          <button type="button" onClick={() => setErrorToast(null)} className="ml-1 text-white/80 hover:text-white text-xs font-extrabold" aria-label="Dismiss">✕</button>
        </div>
      )}
      {successToast && (
        <div className="fixed top-24 right-8 z-50 bg-emerald-600 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500 animate-fade-in">
          <CheckCircle2 className="w-6 h-6 text-white" />
          <span className="font-extrabold text-xs">{successToast}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-2xl sm:rounded-[28px] bg-gradient-to-r from-[#3a0aa8] via-[#450bc8] to-[#3b1799] p-5 sm:p-8 text-white shadow-xl overflow-hidden flex flex-col xl:flex-row xl:items-center justify-between gap-5 sm:gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <span className="px-3.5 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase text-purple-200 border border-white/20">
            Therapist Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">Practitioner Management</h1>
          <p className="text-purple-100 text-xs sm:text-sm mt-1 max-w-xl">
            Configure therapist profiles, platform session fees individually per consultant, manage credentials, and inspect outcome workspace.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-4">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 whitespace-nowrap px-5 py-3 bg-white text-[#450bc8] hover:bg-purple-50 rounded-2xl font-extrabold text-sm shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            <span>Create Consultant</span>
          </button>

          <div className="hidden sm:flex items-center gap-3 bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-2xl">
            <UserCheck className="w-8 h-8 text-purple-200" />
            <div>
              <span className="text-xs text-purple-200 block font-semibold">Total Consultants</span>
              <span className="text-2xl font-extrabold text-white">{therapistsList.length} Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search therapist name or specialization..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:border-[#450bc8] focus:bg-white transition-all"
            />
          </div>

          {/* Profession Filter Dropdown */}
          <div className="relative w-full sm:w-64">
            <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <select
              value={selectedProfession}
              onChange={(e) => setSelectedProfession(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-800 outline-none focus:border-[#450bc8] focus:bg-white appearance-none cursor-pointer transition-all"
            >
              <option value="All">All Professions</option>
              {uniqueProfessions.map((prof) => (
                <option key={prof} value={prof}>
                  {prof}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-3.5 pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#450bc8] hover:bg-[#3a0aa8] text-white rounded-2xl font-bold text-xs shadow-md shadow-[#450bc8]/20 transition-all md:hidden"
          >
            <Plus className="w-4 h-4" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Therapist Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {filteredTherapists.map((t) => {
          const isDropdownOpen = activeDropdownId === t.id;
          return (
            <div
              key={t.id}
              className={`bg-white rounded-3xl p-6 border shadow-sm card-hover flex flex-col gap-4 relative transition-all ${
                t.isArchived
                  ? 'border-slate-300 bg-slate-100/50 opacity-80'
                  : t.isBookingGreyedOut
                  ? 'border-amber-200 bg-amber-50/20'
                  : t.isHiddenFromLive
                  ? 'border-rose-200 bg-rose-50/20'
                  : 'border-slate-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={t.photo}
                      alt={t.name}
                      className={`w-14 h-14 rounded-2xl object-cover ring-2 ${
                        t.isArchived
                          ? 'ring-slate-300 grayscale'
                          : t.isBookingGreyedOut
                          ? 'ring-amber-300 grayscale-[20%]'
                          : t.isHiddenFromLive
                          ? 'ring-rose-200 grayscale-[40%]'
                          : 'ring-purple-100'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug flex items-start gap-1.5">
                      <span className="truncate" title={t.name}>{t.name}</span>
                      {/* Shown only for profiles the admin marked Certified (verified) */}
                      {t.isCertified && (
                        <span title="Certified (verified by an admin)" className="shrink-0">
                          <ShieldCheck className="w-4 h-4 mt-0.5 text-purple-600" aria-label="Certified" />
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium truncate" title={t.profession}>{t.profession}</p>
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
                      {(() => {
                        const rating = getTherapistAverageRating(t);
                        return rating === null ? (
                          <span className="text-slate-500">No reviews yet</span>
                        ) : (
                          <>
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {rating.toFixed(1)}
                          </>
                        );
                      })()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">

                  {/* 3-Dots Action Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(isDropdownOpen ? null : t.id);
                      }}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-xl transition-colors"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(null);
                          }}
                        />
                        <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-30 text-xs font-semibold animate-fade-in">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(null);
                              launchConsultantPanel({
                                id: t.id,
                                name: t.name,
                                email: t.email,
                                role: 'therapist',
                                profession: t.profession,
                                photo: t.photo
                              });
                            }}
                            className="w-full px-3.5 py-2 text-left hover:bg-purple-50 flex items-center gap-2.5 text-[#450bc8] font-bold transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-[#450bc8]" />
                            <span>Launch Consultant Suite</span>
                          </button>

                          <div className="my-1 border-t border-slate-100" />

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(null);
                              handleToggleBookingGreyOut(t.id);
                            }}
                            className={`w-full px-3.5 py-2 text-left hover:bg-amber-50/70 flex items-center gap-2.5 transition-colors ${
                              t.isBookingGreyedOut ? 'text-amber-800 font-bold' : 'text-slate-700'
                            }`}
                          >
                            <CalendarOff className="w-4 h-4 text-amber-600" />
                            <span>{t.isBookingGreyedOut ? 'Enable Bookings' : 'Booking Grey Out'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(null);
                              handleToggleArchive(t.id);
                            }}
                            className={`w-full px-3.5 py-2 text-left hover:bg-purple-50/70 flex items-center gap-2.5 transition-colors ${
                              t.isArchived ? 'text-purple-800 font-bold' : 'text-slate-700'
                            }`}
                          >
                            <Archive className="w-4 h-4 text-purple-600" />
                            <span>{t.isArchived ? 'Unarchive' : 'Archive'}</span>
                          </button>

                          <div className="my-1 border-t border-slate-100" />

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(null);
                              if (window.confirm(`Are you sure you want to delete ${t.name}? This will permanently remove the therapist.`)) {
                                handleDeleteTherapist(t.id);
                              }
                            }}
                            className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2.5 text-rose-600 transition-colors cursor-pointer font-bold"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                            <span>Delete Therapist</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status row: present on every card so the cards line up */}
              <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                {t.isBookingGreyedOut && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[10px] font-extrabold border border-amber-300/80">
                    <CalendarOff className="w-3 h-3" />
                    <span>Bookings Greyed Out</span>
                  </span>
                )}
                {t.isArchived && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-extrabold border border-slate-300">
                    <Archive className="w-3 h-3" />
                    <span>Archived</span>
                  </span>
                )}
                {t.isHiddenFromLive && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-extrabold border border-rose-200">
                    <EyeOff className="w-3 h-3" />
                    <span>Hidden from Live</span>
                  </span>
                )}
                {!t.isBookingGreyedOut && !t.isArchived && !t.isHiddenFromLive && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-extrabold border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Live · Accepting bookings</span>
                  </span>
                )}
              </div>

              {/* Session Fee & Active Clients Badges */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl text-xs">
                <div className="min-w-0 bg-purple-50/70 p-2 rounded-xl border border-purple-100">
                  <span className="text-[10px] text-purple-600 block font-bold uppercase tracking-wider truncate">Session Fee</span>
                  {(() => {
                    // The price clients see on the website: the cheapest current plan, else the stored minimum price
                    const fees = (t.services || []).map((s: any) => Number(s?.sessionFee ?? s?.price)).filter((n) => n > 0);
                    const fee = fees.length ? Math.min(...fees) : Number((t as any).minPrice) > 0 ? Number((t as any).minPrice) : null;
                    return fee !== null ? (
                      <>
                        <span className="font-extrabold text-purple-900 text-sm block truncate">₹{fee.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-purple-500 font-semibold block">per session</span>
                      </>
                    ) : (
                      <>
                        <span className="font-extrabold text-amber-600 text-sm block truncate">Not set</span>
                        <span className="text-[10px] text-amber-600 font-semibold block">Add a service plan</span>
                      </>
                    );
                  })()}
                </div>
                <div className="min-w-0 bg-slate-100/70 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium truncate">Active Clients</span>
                  <span className="font-bold text-slate-900 text-sm block truncate">{t.activeClientsCount || 0}</span>
                  <span className="text-[10px] text-slate-400 font-semibold block">{(t.activeClientsCount || 0) === 1 ? 'client' : 'clients'}</span>
                </div>
              </div>

              <div className="mt-auto pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTherapist(t)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all"
                  >
                    Inspect
                  </button>
                  <button
                    onClick={() => handleStartEdit(t)}
                    className="flex-1 py-2 bg-[#450bc8] hover:bg-[#3a0aa8] text-white rounded-xl font-bold text-xs shadow-md shadow-[#450bc8]/20 transition-all text-center"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Therapist Profile Drawer Modal */}
      {selectedTherapist && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 max-h-[94vh] sm:max-h-[90vh] my-auto overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Modal Header */}
            <div className="pb-4 border-b border-slate-100 space-y-4">
              {/* Row 1: who (full width for the name) + close */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <img src={selectedTherapist.photo} alt={selectedTherapist.name} className="w-16 h-16 shrink-0 rounded-2xl object-cover ring-2 ring-purple-200" />
                  <div className="min-w-0">
                    <h2 className="text-xl font-extrabold text-slate-900 truncate">{selectedTherapist.name}</h2>
                    <p className="text-xs text-slate-500 font-medium truncate">
                      {selectedTherapist.profession}
                      {selectedTherapist.licenseNumber ? ` · License: ${selectedTherapist.licenseNumber}` : ''}
                    </p>
                    {selectedTherapist.email && <p className="text-[11px] text-purple-600 font-bold truncate">{selectedTherapist.email}</p>}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTherapist(null)}
                  className="p-2 -mr-1 shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Row 2: actions (one line each, wrapping on small screens) */}
              <div className="flex flex-wrap items-center gap-2 [&>button]:whitespace-nowrap">
                {/* Launch Consultant Suite Button */}
                <button
                  type="button"
                  onClick={() => {
                    launchConsultantPanel({
                      id: selectedTherapist.id,
                      name: selectedTherapist.name,
                      email: selectedTherapist.email,
                      role: 'therapist',
                      profession: selectedTherapist.profession,
                      photo: selectedTherapist.photo
                    });
                  }}
                  className="px-4 py-2.5 bg-[#450bc8] hover:bg-[#3a0aa8] text-white rounded-xl font-extrabold text-xs shadow-md shadow-[#450bc8]/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch Workspace</span>
                </button>

                {/* Hide from Live toggle */}
                <button
                  onClick={() => handleToggleHideFromLive(selectedTherapist.id)}
                  className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all border ${
                    selectedTherapist.isHiddenFromLive
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-md shadow-emerald-100'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-md shadow-rose-100'
                  }`}
                  title={selectedTherapist.isHiddenFromLive ? 'Click to make visible on live' : 'Click to hide from live'}
                >
                  <EyeOff className="w-4 h-4" />
                  <span>{selectedTherapist.isHiddenFromLive ? 'Show on Live' : 'Hide from Live'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowClientsWorkspaceModal(true);
                    if (assignedClients.length > 0) {
                      setActiveClientInWorkspace(assignedClients[0]);
                    }
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  <Users className="w-4 h-4" />
                  Therapist's Clients ({assignedClientsState === 'loading' ? '…' : assignedClientsState === 'error' ? '?' : assignedClients.length})
                </button>

                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to permanently delete ${selectedTherapist.name}? This will permanently remove their record.`)) {
                      handleDeleteTherapist(selectedTherapist.id);
                    }
                  }}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Delete therapist permanently"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Profile</span>
                </button>
              </div>
            </div>

            {/* Hidden from Live Banner */}
            {selectedTherapist.isHiddenFromLive && (
              <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl">
                <EyeOff className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <p className="font-extrabold text-rose-700 text-xs">Profile Hidden from Live</p>
                  <p className="text-[11px] text-rose-500">
                    This therapist's profile is not visible to users on the live platform. Click "Show on Live" to restore visibility.
                  </p>
                </div>
              </div>
            )}

            {/* Platform Fee & Financial Summary */}
            <div className="bg-gradient-to-r from-purple-50 via-purple-100/50 to-indigo-50 p-4 rounded-2xl border border-purple-200/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider block">Individual Platform Fee Session</span>
                <p className="text-xl font-extrabold text-purple-900 mt-0.5">
                  {(() => {
                    // The plans store the platform fee itself; platformFeePerSession may hold an old session price
                    const plan = (selectedTherapist.services || []).find((s) => Number(s?.sessionFee) > 0 && Number.isFinite(Number(s?.platformFee)));
                    return `₹${plan ? Number(plan.platformFee) : (selectedTherapist.platformFeePerSession ?? 500)}`;
                  })()} <span className="text-xs font-normal text-purple-600">/ session</span>
                </p>
                <p className="text-[11px] text-slate-500">Configured separately for this consultant profile.</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Total Sessions</span>
                <p className="text-xl font-extrabold text-slate-800">{selectedTherapist.totalSessions || 0}</p>
              </div>
            </div>

            {/* Professional Details Badges */}
            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 block font-medium">Experience</span>
                <span className="font-extrabold text-slate-900">{selectedTherapist.experienceYears || 0} Years</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">No of consultation</span>
                <span className="font-extrabold text-slate-900">{selectedTherapist.clientsServed || 0}+ Consultations</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Certification</span>
                <span className={`font-extrabold ${selectedTherapist.isCertified ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {selectedTherapist.isCertified ? 'Certified' : 'Standard'}
                </span>
              </div>
            </div>

            {/* Clinical Outcomes Metrics */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Outcome Scores</h4>
              {outcomesState === 'error' ? (
                <p className="text-xs text-rose-500">Outcome scores could not be loaded. Please try again.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    {
                      label: 'Improvement Score', value: outcomeScores?.improvementScore,
                      detail: outcomeScores ? `${outcomeScores.basis.assessmentPairs} repeat assessment${outcomeScores.basis.assessmentPairs === 1 ? '' : 's'}` : '',
                      box: 'bg-purple-50/60 border-purple-100', text: 'text-purple-700',
                    },
                    {
                      label: 'Goal Achievement', value: outcomeScores?.goalAchievementRate,
                      detail: outcomeScores ? `${outcomeScores.basis.goalsAchieved} of ${outcomeScores.basis.goals} goals` : '',
                      box: 'bg-emerald-50/60 border-emerald-100', text: 'text-emerald-700',
                    },
                    {
                      label: 'Homework Adherence', value: outcomeScores?.homeworkAdherenceRate,
                      detail: outcomeScores ? `${outcomeScores.basis.activitiesCompleted} of ${outcomeScores.basis.activitiesAssigned} activities` : '',
                      box: 'bg-blue-50/60 border-blue-100', text: 'text-blue-700',
                    },
                    {
                      label: 'Attendance Rate', value: outcomeScores?.attendanceRate,
                      detail: outcomeScores ? `${outcomeScores.basis.sessionsCompleted} of ${outcomeScores.basis.sessionsCompleted + outcomeScores.basis.sessionsMissed} sessions` : '',
                      box: 'bg-amber-50/60 border-amber-100', text: 'text-amber-700',
                    },
                  ] as const).map((m) => (
                    <div key={m.label} className={`p-3 rounded-2xl text-center border ${m.box}`}>
                      <span className="text-[11px] text-slate-500 font-medium block">{m.label}</span>
                      {outcomesState === 'loading' ? (
                        <span className="text-lg font-extrabold text-slate-300 animate-pulse">…</span>
                      ) : m.value === null || m.value === undefined ? (
                        <>
                          <span className="text-lg font-extrabold text-slate-300">—</span>
                          <span className="text-[10px] text-slate-400 block">No data yet</span>
                        </>
                      ) : (
                        <>
                          <span className={`text-lg font-extrabold ${m.text}`}>{m.value}%</span>
                          <span className="text-[10px] text-slate-400 block">{m.detail}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bio & Qualifications */}
            <div className="space-y-3 text-xs">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Biography & Qualifications</h4>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl">{selectedTherapist.about || selectedTherapist.bio || 'No biography added yet.'}</p>
              
              <div className="space-y-1">
                <span className="font-bold text-slate-500 block">Qualifications:</span>
                <div className="flex flex-wrap gap-2">
                  {(selectedTherapist.qualifications || []).map((q, idx) => (
                    <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-800 rounded-lg font-semibold border border-purple-100">
                      {q}
                    </span>
                  ))}
                </div>
              </div>

              {selectedTherapist.certificates && selectedTherapist.certificates.length > 0 && (
                <div className="space-y-1 pt-2">
                  <span className="font-bold text-slate-500 block">Certificates:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedTherapist.certificates.map((c, idx) => {
                      const name = typeof c === 'string' ? c : c.name;
                      const url = typeof c === 'string' ? '' : c.url;
                      if (url) {
                        return (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-semibold border border-emerald-100 flex items-center gap-1 transition-all hover:scale-[1.02]"
                          >
                            <span>{name}</span>
                            <Globe className="w-3 h-3 text-emerald-600" />
                          </a>
                        );
                      }
                      return (
                        <span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-semibold border border-emerald-100">
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Languages & Specialties */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                <span className="font-extrabold text-slate-700 block uppercase text-[10px]">Languages Spoken</span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedTherapist.languages || ['English']).map((l, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-medium text-slate-800">
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                <span className="font-extrabold text-slate-700 block uppercase text-[10px]">Specialties</span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedTherapist.specializations || []).map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-medium text-slate-800">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Offered Services */}
            {selectedTherapist.services && selectedTherapist.services.length > 0 && (
              <div className="space-y-3 text-xs">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Offered Services & Platform Fee Breakdown</h4>
                <div className="space-y-2">
                  {selectedTherapist.services.map((srv) => (
                    <div key={srv.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="font-extrabold text-slate-900">{srv.serviceName}</p>
                        <p className="text-[11px] text-slate-500">{srv.durationMinutes} min · {srv.description || 'Therapy session'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900">Session Fee: ₹{srv.sessionFee}</span>
                        <span className="text-[11px] text-purple-700 font-bold block">Platform Fee: ₹{srv.platformFee}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {selectedTherapist.reviews && selectedTherapist.reviews.length > 0 && (
              <div className="space-y-3 text-xs">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client Reviews & Testimonials</h4>
                <div className="space-y-2">
                  {selectedTherapist.reviews.map((r) => (
                    <div key={r.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{r.clientName}</span>
                        <span className="text-amber-600 font-bold flex items-center gap-1 text-[11px]">
                          <Star className="w-3 h-3 fill-amber-400" /> {r.rating} / 5
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] font-medium">{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Therapist's Client Workspace Modal */}
      {showClientsWorkspaceModal && selectedTherapist && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 my-auto max-h-[94vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-[#3a0aa8] via-[#450bc8] to-[#3b1799] text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200">Admin Mirror View</span>
                <h3 className="text-lg font-extrabold">{selectedTherapist.name}'s Client Workspace</h3>
              </div>
              <button onClick={() => setShowClientsWorkspaceModal(false)} className="p-1.5 text-white/80 hover:text-white bg-white/10 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Workspace Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Client Sidebar */}
              <div className="w-64 border-r border-slate-100 p-4 space-y-2 overflow-y-auto bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-2">Assigned Clients</span>
                {assignedClientsState === 'loading' && (
                  <p className="px-2 text-xs text-slate-400">Loading clients…</p>
                )}
                {assignedClientsState === 'error' && (
                  <p className="px-2 text-xs text-rose-500">This therapist's clients could not be loaded. Please try again.</p>
                )}
                {assignedClientsState === 'idle' && assignedClients.length === 0 && (
                  <p className="px-2 text-xs text-slate-400">No clients are assigned to this therapist.</p>
                )}
                {assignedClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => setActiveClientInWorkspace(client)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all ${
                      activeClientInWorkspace?.id === client.id
                        ? 'bg-white shadow-md border border-purple-100 font-bold text-slate-900'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {client.avatar ? (
                      <img src={client.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-purple-100 text-[#450bc8] flex items-center justify-center text-xs font-extrabold shrink-0">
                        {(client.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-bold truncate">{client.name}</p>
                      <p className="text-[10px] text-slate-400">{client.clientNumber || client.service}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Right Workspace Client Details */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {activeClientInWorkspace ? (
                  <>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900">{activeClientInWorkspace.name}</h3>
                        <p className="text-xs text-slate-500">{[activeClientInWorkspace.email, activeClientInWorkspace.phone].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                      <span className={`px-3 py-1 font-bold text-xs rounded-full ${
                        activeClientInWorkspace.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : activeClientInWorkspace.status === 'Completed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {activeClientInWorkspace.status}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 text-slate-400 text-sm">Select a client from the left menu.</div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CREATE CONSULTANT FULL VISIBLE MULTI-SECTION FORM MODAL */}
      {isAddModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseAddModal();
            }
          }}
        >
          <div className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 my-auto overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh]">
            
            {/* Modal Header Bar & Integrated Jump Navigation */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-xs">
              <div className="px-3.5 sm:px-8 pt-3 sm:pt-5 pb-2 sm:pb-3 flex items-center justify-between">
                <div>
                  <button
                    type="button"
                    onClick={handleCloseAddModal}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-0.5 sm:mb-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Back</span>
                  </button>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {editingTherapistId ? 'Edit Consultant Profile' : 'Create Consultant'}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                    {editingTherapistId ? "Update consultant's settings and configurations" : 'Add a new consultant to your platform'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Jump Navigation Bar (Perfectly Aligned) */}
              <div className="px-3.5 sm:px-8 pb-2 sm:pb-3 bg-white">
                <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center justify-center gap-1 overflow-x-auto border border-slate-200/60">
                  {tabLabels.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => scrollToSection(tab.key, tab.sectionId)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        activeSection === tab.key
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90 font-extrabold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {validationError && (
              <div className="mx-8 mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold animate-fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Fully Visible Continuous Form Contents */}
            <form id="create-consultant-form" onSubmit={handleAddTherapistSubmit} className="p-8 flex-1 overflow-y-auto">
              
              {/* SECTION 1: BASIC INFO */}
              {activeSection === 'basic' && (
                <div id="sec-basic" className="space-y-6 pt-2 pb-8 animate-slide-in">
                  <div className="flex items-center gap-2.5 text-[#450bc8]">
                    <FileText className="w-5 h-5" />
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Basic Information</h3>
                      <p className="text-xs text-slate-500 font-medium">Enter the consultant's basic details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Name *</label>
                      <input
                        type="text"
                        placeholder="e.g., John Doe"
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Email *</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Identifier *</label>
                      <input
                        type="text"
                        placeholder="e.g., john-doe"
                        value={formData.identifier}
                        onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Top Consultant Number</label>
                      <input
                        type="number"
                        placeholder="e.g., 1 (Top Ranking)"
                        value={formData.sequence}
                        onChange={(e) => setFormData({ ...formData, sequence: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Notification Title</label>
                      <input
                        type="text"
                        placeholder="Title used for notifications"
                        value={formData.notificationTitle}
                        onChange={(e) => setFormData({ ...formData, notificationTitle: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Profession *</label>
                      <select
                        value={formData.professionId}
                        onChange={(e) => {
                          const prof = professions.find((p) => p.id === e.target.value);
                          setFormData({ ...formData, professionId: prof?.id || '', profession: prof?.name || '' });
                        }}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      >
                        <option value="">
                          {formData.profession && !formData.professionId
                            ? `${formData.profession} (not in the professions list — select one)`
                            : 'Select a profession'}
                        </option>
                        {professions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Photo URL *</label>
                      <div className="flex items-center gap-2">
                        {formData.photo && (
                          <img
                            src={formData.photo}
                            alt=""
                            className="w-10 h-10 shrink-0 rounded-full object-cover ring-2 ring-purple-100 bg-slate-100"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.visibility = 'hidden';
                            }}
                          />
                        )}
                        <input
                          type="text"
                          placeholder="Upload a photo, or paste its link"
                          value={formData.photo}
                          onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                          className="flex-1 min-w-0 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                        />
                        <ImageUploadButton
                          assetType="Consultant"
                          assetName={formData.name ? `${formData.name} photo` : 'Consultant photo'}
                          onUploaded={(url) => setFormData((prev) => ({ ...prev, photo: url }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Photo Alt Text *</label>
                      <input
                        type="text"
                        placeholder="Description of the photo"
                        value={formData.photoAltText}
                        onChange={(e) => setFormData({ ...formData, photoAltText: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700">About *</label>
                    <textarea
                      rows={4}
                      placeholder="Tell us about this consultant..."
                      value={formData.about}
                      onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 2: DETAILS */}
              {activeSection === 'details' && (
                <div id="sec-details" className="space-y-6 pt-2 pb-8 animate-slide-in">
                  <div className="flex items-center gap-2.5 text-[#450bc8]">
                    <Briefcase className="w-5 h-5" />
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Professional Details</h3>
                      <p className="text-xs text-slate-500 font-medium">Add experience, languages, and other details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Years of Experience *</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.experienceYears}
                        onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">No of consultation *</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.clientsServed}
                        onChange={(e) => setFormData({ ...formData, clientsServed: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="isCertifiedCheckboxAligned"
                        checked={formData.isCertified}
                        onChange={(e) => setFormData({ ...formData, isCertified: e.target.checked })}
                        className="w-4 h-4 text-[#450bc8] rounded focus:ring-[#450bc8]"
                      />
                      <label htmlFor="isCertifiedCheckboxAligned" className="text-xs font-bold text-slate-800 cursor-pointer">
                        Is Certified (license verified by the admin team)
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">YouTube URL</label>
                      <input
                        type="url"
                        placeholder="https://youtube.com/..."
                        value={formData.youtubeUrl}
                        onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Grid for Languages & Specialties */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Languages dynamic inputs */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-700">Languages *</label>
                      {formData.languages.map((lang, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="e.g., English"
                            value={lang}
                            onChange={(e) => handleUpdateLanguage(idx, e.target.value)}
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white"
                          />
                          {formData.languages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLanguage(idx)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddLanguage}
                        className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors mt-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Language
                      </button>
                    </div>

                    {/* Specialties dynamic inputs */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-700">Specialties *</label>
                      {formData.specialties.map((spec, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="e.g., Web Development or CBT"
                            value={spec}
                            onChange={(e) => handleUpdateSpecialty(idx, e.target.value)}
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white"
                          />
                          {formData.specialties.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSpecialty(idx)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddSpecialty}
                        className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors mt-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Specialty
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: CREDENTIALS */}
              {activeSection === 'credentials' && (
                <div id="sec-credentials" className="space-y-6 pt-2 pb-8 animate-slide-in">
                  <div className="flex items-center gap-2.5 text-[#450bc8]">
                    <Award className="w-5 h-5" />
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Credentials</h3>
                      <p className="text-xs text-slate-500 font-medium">Add qualifications and certificates</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Qualifications */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-700">Qualifications *</label>
                      {formData.qualifications.map((qual, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="e.g., Bachelor's in Computer Science"
                            value={qual}
                            onChange={(e) => handleUpdateQualification(idx, e.target.value)}
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white"
                          />
                          {formData.qualifications.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQualification(idx)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddQualification}
                        className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors mt-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Qualification
                      </button>
                    </div>

                    {/* Certificates */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-700">Certificates (Optional)</label>
                      {formData.certificates.map((cert, idx) => (
                        <div key={idx} className="flex items-start sm:items-center gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/80">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase">Certificate Name</label>
                              <input
                                type="text"
                                placeholder="e.g. APA Specialist"
                                value={cert.name}
                                onChange={(e) => handleUpdateCertificateName(idx, e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-[#450bc8]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase">Certificate Verification URL</label>
                              <input
                                type="url"
                                placeholder="https://..."
                                value={cert.url}
                                onChange={(e) => handleUpdateCertificateUrl(idx, e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-[#450bc8]"
                              />
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveCertificate(idx)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl mt-4 sm:mt-0"
                            title="Remove Certificate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddCertificate}
                        className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors mt-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Certificate
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: SERVICES (simple: one fee line, then one card per service, like a cart) */}
              {activeSection === 'services' && (() => {
                const feeIsPercent = formData.platformFeeType === 'Percentage';
                const rupees = (n: number) => `₹${Math.max(0, Math.round(n)).toLocaleString('en-IN')}`;
                const removeService = (id: string) =>
                  setFormData((prev) => ({ ...prev, services: prev.services.filter((s) => s.id !== id) }));
                const stepper = (label: string, onMinus: () => void, onPlus: () => void, minusDisabled: boolean) => (
                  <div className="flex items-center justify-between bg-slate-100 rounded-xl px-1 py-1">
                    <button
                      type="button"
                      onClick={onMinus}
                      disabled={minusDisabled}
                      aria-label="Less"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-extrabold text-slate-900 whitespace-nowrap">{label}</span>
                    <button
                      type="button"
                      onClick={onPlus}
                      aria-label="More"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-700 hover:bg-white"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                );

                return (
                  <div id="sec-services" className="space-y-5 pt-2 pb-8 animate-slide-in">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Services</h3>
                      <p className="text-xs text-slate-500 font-medium">What this therapist offers, what clients pay, and what the therapist earns.</p>
                    </div>

                    {/* Hexpertify's fee: one line */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-slate-900">Hexpertify's fee per session</p>
                        <p className="text-xs text-slate-500">The therapist gets the rest of the price.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex p-1 bg-white border border-slate-200 rounded-xl" role="group" aria-label="Fee type">
                          {(['Fixed', 'Percentage'] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => handlePlatformFeeChange(formData.platformFeePerSession, type)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap transition-colors ${
                                formData.platformFeeType === type ? 'bg-[#450bc8] text-white' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {type === 'Fixed' ? '₹ Amount' : '% Percent'}
                            </button>
                          ))}
                        </div>
                        <div className="relative w-28">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{feeIsPercent ? '%' : '₹'}</span>
                          <input
                            type="number"
                            min="0"
                            max={feeIsPercent ? 100 : undefined}
                            value={formData.platformFeePerSession}
                            onChange={(e) => handlePlatformFeeChange(e.target.value, formData.platformFeeType as 'Fixed' | 'Percentage')}
                            placeholder={feeIsPercent ? '20' : '500'}
                            aria-label="Hexpertify's fee"
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-[#450bc8]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Services: one card each */}
                    {formData.services.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                        <p className="text-sm font-bold text-slate-700">No services yet</p>
                        <p className="text-xs text-slate-500 mt-1">Add the sessions this therapist offers, e.g. "1-on-1 Therapy, 60 min".</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.services.map((srv) => {
                          const price = Number(srv.sessionFee) || 0;
                          const fee = Math.min(price, Number(srv.platformFee) || 0);
                          const sessions = Math.max(1, Number(srv.sessions) || 1);
                          const minutes = Math.max(0, Number(srv.durationMinutes) || 0);
                          return (
                            <div key={srv.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
                              {/* Name + remove */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Service name, e.g. 1-on-1 Therapy"
                                  value={srv.serviceName}
                                  onChange={(e) => handleUpdateServiceField(srv.id, 'serviceName', e.target.value)}
                                  className="flex-1 min-w-0 px-3 py-2 bg-transparent border border-slate-200 hover:border-slate-300 focus:border-[#450bc8] rounded-xl text-base font-extrabold text-slate-900 outline-none placeholder:font-semibold placeholder:text-slate-400"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeService(srv.id)}
                                  title="Remove this service"
                                  aria-label="Remove this service"
                                  className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl shrink-0"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>

                              {/* Price, length, sessions, where */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <label className="space-y-1 block">
                                  <span className="text-[11px] font-bold text-slate-500 block">Price</span>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-extrabold text-emerald-700">₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={srv.sessionFee}
                                      onChange={(e) => handleUpdateServiceField(srv.id, 'sessionFee', Number(e.target.value))}
                                      className="w-full pl-7 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-extrabold text-emerald-700 outline-none focus:border-[#450bc8] focus:bg-white"
                                    />
                                  </div>
                                </label>

                                <div className="space-y-1">
                                  <span className="text-[11px] font-bold text-slate-500 block">Length</span>
                                  {stepper(
                                    `${minutes} min`,
                                    () => handleUpdateServiceField(srv.id, 'durationMinutes', Math.max(15, minutes - 15)),
                                    () => handleUpdateServiceField(srv.id, 'durationMinutes', minutes + 15),
                                    minutes <= 15
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[11px] font-bold text-slate-500 block">Sessions</span>
                                  {stepper(
                                    String(sessions),
                                    () => handleUpdateServiceField(srv.id, 'sessions', Math.max(1, sessions - 1)),
                                    () => handleUpdateServiceField(srv.id, 'sessions', sessions + 1),
                                    sessions <= 1
                                  )}
                                </div>

                                <label className="space-y-1 block">
                                  <span className="text-[11px] font-bold text-slate-500 block">Where</span>
                                  <select
                                    value={srv.platform || 'Google Meet'}
                                    onChange={(e) => handleUpdateServiceField(srv.id, 'platform', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[#450bc8] focus:bg-white"
                                  >
                                    <option value="Google Meet">Google Meet</option>
                                    <option value="Zoom">Zoom</option>
                                    <option value="In Person">In Person</option>
                                    <option value="Phone Call">Phone Call</option>
                                  </select>
                                </label>
                              </div>

                              {/* Who gets what, in one line */}
                              <p className="text-xs text-slate-500 pt-2.5 border-t border-slate-100 flex flex-wrap gap-x-3 gap-y-1">
                                <span>Client pays <b className="text-slate-900">{rupees(price)}</b></span>
                                <span>Hexpertify <b className="text-[#450bc8]">{rupees(fee)}</b></span>
                                <span>Therapist gets <b className="text-emerald-700">{rupees(price - fee)}</b></span>
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddService}
                      className="w-full flex items-center justify-center gap-1.5 py-3 border-2 border-dashed border-slate-300 hover:border-[#450bc8] hover:text-[#450bc8] rounded-2xl text-sm font-bold text-slate-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add service
                    </button>
                  </div>
                );
              })()}

              {/* SECTION 5: CLIENT REVIEWS */}
              {activeSection === 'reviews' && (
                <div id="sec-reviews" className="space-y-6 pt-2 pb-8 animate-slide-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5 text-[#450bc8]">
                      <Star className="w-5 h-5" />
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">Client Reviews</h3>
                        <p className="text-xs text-slate-500 font-medium">Add and manage client reviews and testimonials</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddReview}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#450bc8] hover:bg-[#3a0aa8] text-white rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Review</span>
                    </button>
                  </div>

                  {formData.reviews.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl space-y-2">
                      <Star className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">No client reviews added yet.</p>
                      <p className="text-[11px] text-slate-400">Click "+ Add Review" above to collect testimonials.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {formData.reviews.map((rev, index) => (rev.isVerifiedClient || rev.verified || rev.clientId) ? (
                        // Written by a signed-in client: shown read-only and never sent back on save
                        <div
                          key={rev.id}
                          className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-800">
                              Review #{index + 1} · {rev.clientName || 'Client'}
                            </span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Verified client · read-only
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                            <Star className="w-3.5 h-3.5 fill-current" /> {rev.rating}/5
                            {rev.date && <span className="text-slate-400 font-medium ml-2">{rev.date}</span>}
                          </div>
                          {rev.comment && <p className="text-xs text-slate-600 whitespace-pre-wrap">{rev.comment}</p>}
                        </div>
                      ) : (
                        <div
                          key={rev.id}
                          className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-5 relative"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-purple-100 text-[#450bc8] flex items-center justify-center text-[10px]">
                                {index + 1}
                              </span>
                              Review #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveReview(rev.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Delete Review"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Grid 1: Client Name & Client Title */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-extrabold text-slate-800">
                                Client Name <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g., Jane Smith"
                                value={rev.clientName}
                                onChange={(e) => handleUpdateReviewField(rev.id, 'clientName', e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] text-slate-800 placeholder:text-slate-400"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-extrabold text-slate-800">
                                Client Title <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g., CEO at Tech Com"
                                value={rev.clientTitle || ''}
                                onChange={(e) => handleUpdateReviewField(rev.id, 'clientTitle', e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] text-slate-800 placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          {/* Grid 2: Rating & Review Date */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-extrabold text-slate-800">
                                Rating <span className="text-rose-500">*</span>
                              </label>
                              <select
                                value={rev.rating}
                                onChange={(e) => handleUpdateReviewField(rev.id, 'rating', Number(e.target.value))}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] text-slate-800"
                              >
                                <option value={5}>5 Stars - Excellent</option>
                                <option value={4}>4 Stars - Very Good</option>
                                <option value={3}>3 Stars - Good</option>
                                <option value={2}>2 Stars - Fair</option>
                                <option value={1}>1 Star - Poor</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-extrabold text-slate-800">Review Date</label>
                              <input
                                type="date"
                                value={rev.date ? rev.date.split('T')[0] : ''}
                                onChange={(e) => handleUpdateReviewField(rev.id, 'date', e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] text-slate-800"
                              />
                            </div>
                          </div>

                          {/* Review Comment */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-800">
                              Review Comment <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Write the review comment..."
                              value={rev.comment}
                              onChange={(e) => handleUpdateReviewField(rev.id, 'comment', e.target.value)}
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] text-slate-800 placeholder:text-slate-400 leading-relaxed resize-y"
                            />
                            <p className="text-[11px] text-slate-500 font-medium">
                              {(rev.comment || '').length} characters
                            </p>
                          </div>

                          {/* Review Images */}
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <div>
                              <label className="text-xs font-extrabold text-slate-800 block">Review Images</label>
                              <p className="text-[11px] text-slate-500 font-medium">Add images showcasing the service or results</p>
                            </div>

                            {(rev.images || []).length > 0 && (
                              <div className="space-y-2">
                                {(rev.images || []).map((imgUrl, imgIdx) => (
                                  <div key={imgIdx} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                    <input
                                      type="text"
                                      placeholder="https://..."
                                      value={imgUrl}
                                      onChange={(e) => handleUpdateReviewImage(rev.id, imgIdx, e.target.value)}
                                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-[#450bc8]"
                                    />
                                    {imgUrl && (
                                      <img
                                        src={imgUrl}
                                        alt="Review asset"
                                        className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveReviewImage(rev.id, imgIdx)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAddReviewImage(rev.id)}
                              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Image</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add Review Shortcut at bottom */}
                      <button
                        type="button"
                        onClick={handleAddReview}
                        className="w-full py-3.5 border-2 border-dashed border-[#450bc8]/30 hover:border-[#450bc8]/60 text-[#450bc8] hover:bg-purple-50/40 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Another Client Review</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 6: FAQS */}
              {activeSection === 'faqs' && (
                <div id="sec-faqs" className="space-y-6 pt-2 pb-8 animate-slide-in">
                  <div className="flex items-center gap-2.5 text-[#450bc8]">
                    <HelpCircle className="w-5 h-5" />
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Frequently Asked Questions</h3>
                      <p className="text-xs text-slate-500 font-medium">Add FAQs specifically for this consultant profile</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      FAQs ({formData.faqs.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddFAQForm(true)}
                      className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add FAQ
                    </button>
                  </div>

                  {formData.faqs.length === 0 && !showAddFAQForm && (
                    <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                      <p className="text-xs font-semibold text-slate-400">No FAQs added yet.</p>
                    </div>
                  )}

                  {formData.faqs.map((f) => {
                    const isEditing = editingFAQId === f.id;
                    return (
                      <div key={f.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-extrabold text-[#450bc8]">Edit FAQ Item</h4>
                              <button
                                type="button"
                                onClick={() => setEditingFAQId(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-500 uppercase">Question</label>
                              <input
                                type="text"
                                value={f.question}
                                onChange={(e) => handleUpdateFAQField(f.id, 'question', e.target.value)}
                                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#450bc8]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-500 uppercase">Answer</label>
                              <textarea
                                rows={3}
                                value={f.answer}
                                onChange={(e) => handleUpdateFAQField(f.id, 'answer', e.target.value)}
                                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#450bc8] resize-y"
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingFAQId(null)}
                                className="px-4 py-1.5 bg-[#450bc8] hover:bg-[#3a0aa8] text-white text-xs font-extrabold rounded-xl transition-colors shadow-xs"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <h4 className="font-extrabold text-xs text-slate-900">Q: {f.question}</h4>
                              <p className="text-xs text-slate-600">A: {f.answer}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditingFAQId(f.id)}
                                className="p-1.5 hover:bg-purple-50 text-slate-400 hover:text-[#450bc8] rounded-lg transition-colors"
                                title="Edit FAQ"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveFAQ(f.id)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                title="Delete FAQ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {showAddFAQForm && (
                    <div className="p-4 bg-white border border-purple-200 rounded-2xl space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-900">New FAQ Item</h4>
                      <input
                        type="text"
                        placeholder="Question (e.g. What is your cancellation policy?)"
                        value={newFAQ.question}
                        onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#450bc8]"
                      />
                      <textarea
                        rows={2}
                        placeholder="Answer details..."
                        value={newFAQ.answer}
                        onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#450bc8] resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddFAQForm(false)}
                          className="px-3 py-1.5 text-xs text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveFAQ}
                          className="px-4 py-1.5 bg-[#450bc8] text-white text-xs font-bold rounded-xl"
                        >
                          Save FAQ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: BANKING & PAYOUT */}
              {activeSection === 'banking' && (
                <div id="sec-banking" className="space-y-6 pt-2 pb-8 animate-slide-in">
                  <div className="flex items-center gap-2.5 text-[#450bc8]">
                    <Building2 className="w-5 h-5" />
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Banking & Payout Details</h3>
                      <p className="text-xs text-slate-500 font-medium">Configure bank transfer and UPI credentials for consultant disbursals</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Bank Name</label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC Bank, State Bank of India, ICICI Bank"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 50100429182371"
                        value={formData.bankAccountNumber}
                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC0001234"
                        value={formData.bankIfsc}
                        onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold uppercase outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Beneficiary / Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Marcus Vance"
                        value={formData.accountHolderName}
                        onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-extrabold text-slate-700">UPI ID / Virtual Payment Address (VPA)</label>
                      <input
                        type="text"
                        placeholder="e.g. drmarcusvance@okaxis or 9876543210@upi"
                        value={formData.upiId}
                        onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-medium outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                      />
                      <p className="text-[11px] text-slate-400 font-medium">
                        Used for instant real-time transfers via NPCI clearance when UPI disbursal mode is selected.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 7: SEO */}
              {activeSection === 'seo' && (
                <div id="sec-seo" className="space-y-8 pt-2 pb-6 animate-slide-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5 text-[#450bc8]">
                      <Globe className="w-5 h-5" />
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">SEO Settings</h3>
                        <p className="text-xs text-slate-500 font-medium">Search engine optimization and social sharing configuration for consultant landing page</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-purple-50 text-[#450bc8] rounded-full text-[10px] font-extrabold uppercase tracking-wide border border-purple-100">
                      Search & Social
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Form Fields */}
                    <div className="space-y-6">
                      {/* Subsection: Standard Meta Tags */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          Standard Meta Tags
                        </h4>
                        
                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-slate-700">Meta Title</label>
                          <input
                            type="text"
                            placeholder="e.g. Dr. John Doe | Psychologist in New York"
                            value={formData.seo.metaTitle}
                            onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, metaTitle: e.target.value } })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#450bc8] focus:bg-white transition-all font-medium text-slate-800"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-slate-700">Meta Description</label>
                          <textarea
                            rows={3}
                            placeholder="Book therapy sessions with Dr. John Doe..."
                            value={formData.seo.metaDescription}
                            onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, metaDescription: e.target.value } })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#450bc8] focus:bg-white transition-all resize-none font-medium text-slate-800"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700">Keywords</label>
                            <input
                              type="text"
                              placeholder="e.g. psychologist, CBT, anxiety"
                              value={formData.seo.keywords}
                              onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, keywords: e.target.value } })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#450bc8] focus:bg-white transition-all font-medium text-slate-800"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700">Canonical URL</label>
                            <input
                              type="url"
                              placeholder="https://hexpertify.com/consultants/john-doe"
                              value={formData.seo.canonicalUrl}
                              onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, canonicalUrl: e.target.value } })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#450bc8] focus:bg-white transition-all font-medium text-slate-800"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Subsection: Open Graph Social Tags */}
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                            Open Graph / Social Sharing
                          </h4>
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              seo: {
                                ...formData.seo,
                                ogTitle: formData.seo.ogTitle || formData.seo.metaTitle || (formData.name.trim() ? defaultSeoTitle(formData.name, (professions.find((p) => p.id === formData.professionId)?.name || formData.profession)) : ''),
                                ogDescription: formData.seo.ogDescription || formData.seo.metaDescription || defaultSeoDescription(formData.name, formData.about)
                              }
                            })}
                            className="flex items-center gap-1 text-[10px] font-extrabold text-[#450bc8] bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-100 transition-all active:scale-95"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Sync from Meta Tags
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-slate-700">OG Title</label>
                          <input
                            type="text"
                            placeholder="Social share title..."
                            value={formData.seo.ogTitle}
                            onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, ogTitle: e.target.value } })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#450bc8] focus:bg-white transition-all font-medium text-slate-800"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-slate-700">OG Description</label>
                          <textarea
                            rows={2}
                            placeholder="Social share description..."
                            value={formData.seo.ogDescription}
                            onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, ogDescription: e.target.value } })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#450bc8] focus:bg-white transition-all resize-none font-medium text-slate-800"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-extrabold text-slate-700">OG Image URL</label>
                              <button
                                type="button"
                                onClick={() => setFormData({
                                  ...formData,
                                  seo: {
                                    ...formData.seo,
                                    ogImageUrl: formData.photo || ''
                                  }
                                })}
                                className="text-[10px] font-bold text-[#450bc8] hover:underline"
                              >
                                Use Profile Photo
                              </button>
                            </div>
                            <input
                              type="url"
                              placeholder="https://..."
                              value={formData.seo.ogImageUrl}
                              onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, ogImageUrl: e.target.value } })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#450bc8] focus:bg-white transition-all font-medium text-slate-800"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700">OG Image Alt Text</label>
                            <input
                              type="text"
                              placeholder="Image description..."
                              value={formData.seo.ogImageAltText}
                              onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, ogImageAltText: e.target.value } })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#450bc8] focus:bg-white transition-all font-medium text-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Interactive Previews */}
                    <div className="space-y-6 lg:border-l lg:border-slate-100 lg:pl-8">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          Live Dynamic Preview
                        </h4>
                        
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => setPreviewTab('search')}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${previewTab === 'search' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            Google Search
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewTab('social')}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${previewTab === 'social' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            Social Card
                          </button>
                        </div>
                      </div>

                      {/* Google Search Preview Card */}
                      {previewTab === 'search' && (
                        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium overflow-hidden whitespace-nowrap text-ellipsis">
                            <span className="bg-slate-100 p-1.5 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Globe className="w-3 h-3 text-slate-500" />
                            </span>
                            <div>
                              <p className="text-[10px] text-slate-400 leading-none">Hexpertify</p>
                              <p className="text-[11px] leading-tight text-slate-600 truncate mt-0.5">
                                {formData.seo.canonicalUrl || `https://hexpertify.com/consultants/${formData.identifier || 'john-doe'}`}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h5 className="text-[15px] font-semibold text-[#1a0dab] hover:underline cursor-pointer leading-tight truncate">
                              {formData.seo.metaTitle || (formData.name.trim() ? defaultSeoTitle(formData.name, (professions.find((p) => p.id === formData.professionId)?.name || formData.profession)) : 'Consultant name | Profession')}
                            </h5>
                            <p className="text-xs text-slate-655 leading-relaxed line-clamp-2">
                              {formData.seo.metaDescription || defaultSeoDescription(formData.name, formData.about)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Social Media OG Preview Card */}
                      {previewTab === 'social' && (
                        <div className="border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs bg-white">
                          {/* Mock Card Image Header */}
                          <div className="relative aspect-[1.91/1] bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-200/70">
                            {formData.seo.ogImageUrl || formData.photo ? (
                              <img
                                src={formData.seo.ogImageUrl || formData.photo}
                                alt={formData.seo.ogImageAltText || 'Social preview og image'}
                                className="w-full h-full object-cover transition-opacity duration-300"
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600';
                                }}
                              />
                            ) : (
                              <div className="text-center p-4 space-y-2">
                                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
                                <span className="text-[10px] font-bold text-slate-400 block">No OG Image Url provided</span>
                                <span className="text-[9px] text-slate-400 block">Falling back to profile photo or default placeholder</span>
                              </div>
                            )}
                            <div className="absolute top-3 left-3 bg-slate-900/60 backdrop-blur-md text-white font-extrabold text-[8px] uppercase tracking-wider px-2 py-1 rounded-md">
                              og:image
                            </div>
                          </div>

                          {/* Mock Card Body Details */}
                          <div className="p-4 space-y-1 bg-slate-50">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">
                              hexpertify.com
                            </span>
                            <h5 className="font-extrabold text-slate-800 text-sm leading-snug line-clamp-1">
                              {formData.seo.ogTitle || formData.seo.metaTitle || (formData.name.trim() ? defaultSeoTitle(formData.name, (professions.find((p) => p.id === formData.professionId)?.name || formData.profession)) : 'Consultant name | Profession')}
                            </h5>
                            <p className="text-xs text-slate-500 font-medium leading-normal line-clamp-2 font-medium">
                              {formData.seo.ogDescription || formData.seo.metaDescription || defaultSeoDescription(formData.name, formData.about)}
                            </p>
                          </div>
                        </div>
                      )}



                      {/* SEO Quality Helper Card */}
                      <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-blue-50/70 p-5 rounded-2xl border border-purple-100 space-y-3">
                        <h5 className="text-[11px] font-extrabold text-[#450bc8] uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#450bc8]" />
                          SEO Excellence Checklist
                        </h5>
                        <ul className="space-y-2 text-[11px] text-slate-655 font-medium">
                          <li className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${formData.seo.metaTitle.length >= 30 && formData.seo.metaTitle.length <= 60 ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                            <span>Title Length: {formData.seo.metaTitle.length} chars (Recommended: 30-60)</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${formData.seo.metaDescription.length >= 100 && formData.seo.metaDescription.length <= 160 ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                            <span>Description Length: {formData.seo.metaDescription.length} chars (Recommended: 100-160)</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${formData.seo.keywords ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span>Keywords: {formData.seo.keywords ? 'Defined' : 'Not Defined (Optional)'}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${formData.seo.ogImageUrl ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span>OG Image: {formData.seo.ogImageUrl ? 'Configured' : 'Will fall back to profile image'}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Subsection: Advanced SEO Scripts */}
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-slate-400" />
                      Advanced Scripts & Code Injections
                    </h4>

                    <div className="space-y-4">


                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-slate-700">Custom HTML Chunk (Optional)</label>
                        <RichCodeEditor
                          value={formData.seo.htmlChunk}
                          onChange={(val) => setFormData({ ...formData, seo: { ...formData.seo, htmlChunk: val } })}
                          placeholder="e.g. <meta name='robots' content='index,follow'> or custom script/style tags..."
                          helperText="Optional HTML tags or scripts to inject directly into the page header/body."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Fixed Modal Footer Bar - Anchored at bottom of modal dialog */}
            <div className="px-3.5 sm:px-8 py-2.5 sm:py-4 bg-white border-t border-slate-100 flex items-center justify-between flex-shrink-0 z-30 shadow-md">
              <div>
                {activeSection !== 'basic' && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-6 py-3 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    Back
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-6 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>

                {activeSection !== 'seo' ? (
                  <button
                    // Separate keys: React must not turn this same button into the submit button while the
                    // click is still being handled (that submitted the form when moving to the last step)
                    key="next-step"
                    type="button"
                    onClick={handleNextStep}
                    className="px-8 py-3 bg-[#450bc8] hover:bg-[#3a0aa8] text-white rounded-xl font-extrabold text-xs shadow-lg shadow-[#450bc8]/30 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    key="submit-form"
                    type="submit"
                    form="create-consultant-form"
                    disabled={isSaving}
                    className="px-8 py-3 bg-[#450bc8] hover:bg-[#3a0aa8] text-white rounded-xl font-extrabold text-xs shadow-lg shadow-[#450bc8]/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {isSaving ? 'Saving…' : editingTherapistId ? 'Update Profile' : 'Create Consultant'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
