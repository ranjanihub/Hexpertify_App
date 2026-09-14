import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  UserCheck,
  CheckCircle2,
  Star,
  Users,
  ShieldCheck,
  X,
  Activity,
  UserPlus,
  Plus,
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
import { mockProfessions } from '../data/mockData';
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
    <div className="w-full border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs focus-within:border-[#5e2be2] focus-within:ring-1 focus-within:ring-[#5e2be2]/10 transition-all">
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
              ? 'bg-[#5e2be2] text-white'
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
              <div dangerouslySetInnerHTML={{ __html: value }} />
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

interface TherapistsViewProps {
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

type SectionKey = 'basic' | 'details' | 'credentials' | 'services' | 'reviews' | 'faqs' | 'banking' | 'seo';

export const TherapistsView: React.FC<TherapistsViewProps> = ({
  isAddModalOpen: isAddModalProp = false,
  onCloseAddModal
}) => {
  const { therapists, clients, deleteTherapist } = useAppContext();
  const [therapistsList, setTherapistsList] = useState<Therapist[]>(therapists);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfession, setSelectedProfession] = useState<string>('All');
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [showClientsWorkspaceModal, setShowClientsWorkspaceModal] = useState(false);
  const [activeClientInWorkspace, setActiveClientInWorkspace] = useState<Client | null>(null);
  const [isAddModalInternalOpen, setIsAddModalInternalOpen] = useState(false);

  React.useEffect(() => {
    if (therapists && therapists.length > 0) {
      setTherapistsList(therapists);
    }
  }, [therapists]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>('basic');
  const [previewTab, setPreviewTab] = useState<'search' | 'social' | 'html'>('search');
  const [editingTherapistId, setEditingTherapistId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [editingFAQId, setEditingFAQId] = useState<string | null>(null);

  // Form State for Create / Add Consultant
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    identifier: '',
    sequence: '1',
    notificationTitle: '',
    profession: '',
    photo: '',
    photoAltText: '',
    about: '',
    experienceYears: '0',
    clientsServed: '0',
    isCertified: false,
    youtubeUrl: '',
    languages: ['English'],
    specialties: ['Mental Health'],
    qualifications: ["Bachelor's in Psychology"],
    certificates: [] as { name: string; url: string }[],
    platformFeePerSession: '500',
    platformFeeType: 'Fixed' as 'Fixed' | 'Percentage',
    services: [] as TherapistServiceItem[],
    reviews: [] as TherapistReviewItem[],
    faqs: [] as TherapistFAQItem[],
    bankName: 'HDFC Bank',
    bankAccountNumber: '',
    bankIfsc: 'HDFC0001234',
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

  const handleOpenCreateModal = () => {
    setEditingTherapistId(null);
    setFormData({
      name: '',
      email: '',
      identifier: '',
      sequence: '1',
      notificationTitle: '',
      profession: '',
      photo: '',
      photoAltText: '',
      about: '',
      experienceYears: '0',
      clientsServed: '0',
      isCertified: false,
      youtubeUrl: '',
      languages: ['English'],
      specialties: ['Mental Health'],
      qualifications: ["Bachelor's in Psychology"],
      certificates: [],
      platformFeePerSession: '500',
      platformFeeType: 'Fixed',
      services: [],
      reviews: [],
      faqs: [],
      bankName: 'HDFC Bank',
      bankAccountNumber: '',
      bankIfsc: 'HDFC0001234',
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
    setActiveSection('basic');
    setIsAddModalInternalOpen(true);
  };

  const handleStartEdit = (t: Therapist) => {
    setEditingTherapistId(t.id);
    setFormData({
      name: (t.name || '').replace(/^Dr\.\s+/i, ''),
      email: t.email || '',
      identifier: t.identifier || '',
      sequence: String(t.sequence || 1),
      notificationTitle: t.notificationTitle || '',
      profession: t.profession || '',
      photo: t.photo || '',
      photoAltText: t.photoAltText || '',
      about: t.about || t.bio || '',
      experienceYears: String(t.experienceYears || 0),
      clientsServed: String(t.clientsServed || 0),
      isCertified: Boolean(t.isCertified),
      youtubeUrl: t.youtubeUrl || '',
      languages: Array.isArray(t.languages) && t.languages.length > 0 ? t.languages : ['English'],
      specialties: Array.isArray(t.specializations) && t.specializations.length > 0 ? t.specializations : ['Mental Health'],
      qualifications: Array.isArray(t.qualifications) && t.qualifications.length > 0 ? t.qualifications : ["Bachelor's in Psychology"],
      certificates: (t.certificates || []).map((c) => {
        if (typeof c === 'string') {
          return { name: c, url: '' };
        }
        return { name: c.name || '', url: c.url || '' };
      }),
      platformFeePerSession: String(t.services?.[0]?.sessionFee || (t.services?.[0] as any)?.price || (t as any).fees || (t as any).minPrice || t.platformFeePerSession || 2000),
      platformFeeType: t.platformFeeType || 'Fixed',
      services: t.services && t.services.length > 0 ? t.services : [
        {
          id: `srv-1`,
          serviceName: '1-on-1 Consultation',
          platform: 'Google Meet',
          sessionFee: Number((t as any).fees || (t as any).minPrice || t.platformFeePerSession || 2000),
          durationMinutes: 60,
          sessions: 1,
          platformFee: Number(t.platformFeePerSession || 500),
          description: '1-on-1 clinical consultation'
        }
      ],
      reviews: t.reviews || [],
      faqs: t.faqs || [],
      bankName: t.bankName || 'HDFC Bank',
      bankAccountNumber: t.bankAccountNumber || '',
      bankIfsc: t.bankIfsc || 'HDFC0001234',
      accountHolderName: t.accountHolderName || t.name || '',
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
    const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setFormData((prev) => ({
      ...prev,
      name: val,
      identifier: prev.identifier && prev.identifier !== slug ? prev.identifier : slug,
      email: prev.email ? prev.email : (val ? `${slug}@hexpertify.com` : '')
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

    setValidationError(null);

    const defaultPhoto = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300';
    const formattedName = formData.name.trim().startsWith('Dr.') ? formData.name.trim() : `Dr. ${formData.name.trim()}`;
    const slug = formData.identifier || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const newTherapist: Therapist = {
      id: `therapist-${Date.now()}`,
      name: formattedName,
      email: formData.email.trim() || `${slug}@hexpertify.com`,
      identifier: slug,
      sequence: Number(formData.sequence) || 1,
      notificationTitle: formData.notificationTitle.trim() || `${formattedName} - ${formData.profession}`,
      photo: formData.photo.trim() || defaultPhoto,
      photoAltText: formData.photoAltText.trim() || `Photo of ${formattedName}`,
      profession: formData.profession,
      rating: 5.0,
      reviewCount: formData.reviews.length || 1,
      activeClientsCount: 0,
      verificationStatus: 'Verified',
      accountStatus: 'Active',
      qualifications: formData.qualifications.filter((q) => q.trim().length > 0),
      certificates: formData.certificates.filter((c) => c.name.trim().length > 0),
      experienceYears: parseInt(formData.experienceYears, 10) || 0,
      clientsServed: parseInt(formData.clientsServed, 10) || 0,
      isCertified: formData.isCertified,
      youtubeUrl: formData.youtubeUrl.trim(),
      languages: formData.languages.filter((l) => l.trim().length > 0),
      bio: formData.about.trim() || 'Dedicated clinical therapist providing compassionate and evidence-based mental health care.',
      about: formData.about.trim(),
      specializations: formData.specialties.filter((s) => s.trim().length > 0),
      licenseNumber: `LIC-${Math.floor(100000 + Math.random() * 900000)}`,
      platformFeePerSession: Number(
        formData.services?.[0]?.sessionFee || 
        (formData.services?.[0] as any)?.price || 
        formData.platformFeePerSession || 
        2000
      ),
      platformFeeType: formData.platformFeeType,
      totalRevenue: 0,
      therapyHours: 0,
      totalSessions: 0,
      services: formData.services,
      reviews: formData.reviews,
      faqs: formData.faqs,
      seo: {
        metaTitle: formData.seo.metaTitle || `${formattedName} | ${formData.profession}`,
        metaDescription: formData.seo.metaDescription || `Book sessions with ${formattedName}...`,
        keywords: formData.seo.keywords || `${formData.profession}, therapy`,
        canonicalUrl: formData.seo.canonicalUrl || `https://hexpertify.com/consultants/${slug}`,
        ogTitle: formData.seo.ogTitle || formData.seo.metaTitle || `${formattedName} | ${formData.profession}`,
        ogDescription: formData.seo.ogDescription || formData.seo.metaDescription || `Book sessions with ${formattedName}...`,
        ogImageUrl: formData.seo.ogImageUrl || formData.photo,
        ogImageAltText: formData.seo.ogImageAltText || `Photo of ${formattedName}`,
        structuredData: formData.seo.structuredData,
        htmlChunk: formData.seo.htmlChunk
      },
      bankName: formData.bankName.trim() || 'HDFC Bank',
      bankAccountNumber: formData.bankAccountNumber.trim() || '•••• •••• 5336',
      bankIfsc: formData.bankIfsc.trim().toUpperCase() || 'HDFC0001234',
      accountHolderName: formData.accountHolderName.trim() || formattedName,
      upiId: formData.upiId.trim() || `${slug}@okaxis`,
      outcomes: {
        clientImprovementScore: 95,
        goalAchievementRate: 92,
        homeworkAdherenceRate: 90,
        attendanceRate: 98
      },
      assignedClientIds: []
    };

    if (editingTherapistId) {
      // Persist Update to MongoDB Atlas
      try {
        await api.put('/api/admin/consultants', { ...newTherapist, id: editingTherapistId });
        setSuccessToast(`Consultant ${formattedName} updated successfully in MongoDB!`);
      } catch (err) {
        console.error('Error updating consultant in DB:', err);
        setSuccessToast(`Warning: ${formattedName} updated locally but may not have saved to database.`);
      }

      setTherapistsList((prev) =>
        prev.map((t) => (t.id === editingTherapistId ? { 
          ...t, 
          ...newTherapist, 
          id: t.id,
          rating: t.rating,
          reviewCount: t.reviewCount,
          activeClientsCount: t.activeClientsCount,
          verificationStatus: t.verificationStatus,
          accountStatus: t.accountStatus,
          totalRevenue: t.totalRevenue,
          therapyHours: t.therapyHours,
          totalSessions: t.totalSessions,
          assignedClientIds: t.assignedClientIds,
          outcomes: t.outcomes
        } : t))
      );
    } else {
      // Persist Create to MongoDB Atlas
      try {
        const data = await api.post('/api/admin/consultants', newTherapist);
        const saved = data.consultant || newTherapist;
        setTherapistsList((prev) => [saved, ...prev.filter(t => t.id !== saved.id)]);
        setSuccessToast(`Consultant ${formattedName} created successfully in MongoDB!`);
      } catch (err) {
        console.error('Error creating consultant in DB:', err);
        setTherapistsList([newTherapist, ...therapistsList]);
        setSuccessToast(`Warning: ${formattedName} added locally but may not have saved to database.`);
      }
    }
    setTimeout(() => setSuccessToast(null), 5000);

    // Reset form state
    setFormData({
      name: '',
      email: '',
      identifier: '',
      sequence: '1',
      notificationTitle: '',
      profession: '',
      photo: '',
      photoAltText: '',
      about: '',
      experienceYears: '0',
      clientsServed: '0',
      isCertified: false,
      youtubeUrl: '',
      languages: ['English'],
      specialties: ['Mental Health'],
      qualifications: ["Bachelor's in Psychology"],
      certificates: [],
      platformFeePerSession: '500',
      platformFeeType: 'Fixed',
      services: [],
      reviews: [],
      faqs: [],
      bankName: 'HDFC Bank',
      bankAccountNumber: '',
      bankIfsc: 'HDFC0001234',
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
    handleCloseAddModal();
  };

  const uniqueProfessions = Array.from(
    new Set([
      ...mockProfessions.map((p) => p.serviceName),
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

  const handleToggleHideFromLive = (therapistId: string) => {
    const target = therapistsList.find((t) => t.id === therapistId);
    const nextState = target ? !target.isHiddenFromLive : true;

    setTherapistsList((prev) =>
      prev.map((t) =>
        t.id === therapistId ? { ...t, isHiddenFromLive: nextState } : t
      )
    );

    // Persist to MongoDB Atlas
    api.put('/api/admin/consultants', { id: therapistId, isHiddenFromLive: nextState }).catch((err) => {
      console.error('Error persisting hide-from-live toggle:', err);
      setSuccessToast(`Failed to save hide-from-live change. Please retry.`);
      setTimeout(() => setSuccessToast(null), 4000);
      // Revert optimistic update
      setTherapistsList((prev) =>
        prev.map((t) =>
          t.id === therapistId ? { ...t, isHiddenFromLive: !nextState } : t
        )
      );
    });

    if (target) {
      setSuccessToast(
        nextState
          ? `${target.name}'s profile is now hidden from live.`
          : `${target.name}'s profile is now visible on live.`
      );
      setTimeout(() => setSuccessToast(null), 4000);
      if (selectedTherapist?.id === therapistId) {
        setSelectedTherapist({ ...target, isHiddenFromLive: nextState });
      }
    }
  };

  const handleToggleBookingGreyOut = (therapistId: string) => {
    const target = therapistsList.find((t) => t.id === therapistId);
    const nextState = target ? !target.isBookingGreyedOut : true;

    setTherapistsList((prev) =>
      prev.map((t) =>
        t.id === therapistId ? { ...t, isBookingGreyedOut: nextState } : t
      )
    );

    // Persist to MongoDB Atlas
    api.put('/api/admin/consultants', { id: therapistId, isBookingGreyedOut: nextState }).catch((err) => {
      console.error('Error persisting booking grey-out toggle:', err);
      setSuccessToast(`Failed to save booking grey-out change. Please retry.`);
      setTimeout(() => setSuccessToast(null), 4000);
      // Revert optimistic update
      setTherapistsList((prev) =>
        prev.map((t) =>
          t.id === therapistId ? { ...t, isBookingGreyedOut: !nextState } : t
        )
      );
    });

    if (target) {
      setSuccessToast(
        nextState
          ? `Booking grey out enabled for ${target.name}.`
          : `Booking grey out disabled for ${target.name}.`
      );
      setTimeout(() => setSuccessToast(null), 4000);
      if (selectedTherapist?.id === therapistId) {
        setSelectedTherapist({ ...target, isBookingGreyedOut: nextState });
      }
    }
  };

  const handleToggleArchive = (therapistId: string) => {
    const target = therapistsList.find((t) => t.id === therapistId);
    const nextState = target ? !target.isArchived : true;

    setTherapistsList((prev) =>
      prev.map((t) =>
        t.id === therapistId ? { ...t, isArchived: nextState } : t
      )
    );

    // Persist to MongoDB Atlas
    api.put('/api/admin/consultants', { id: therapistId, isArchived: nextState }).catch((err) => {
      console.error('Error persisting archive toggle:', err);
      setSuccessToast(`Failed to save archive change. Please retry.`);
      setTimeout(() => setSuccessToast(null), 4000);
      // Revert optimistic update
      setTherapistsList((prev) =>
        prev.map((t) =>
          t.id === therapistId ? { ...t, isArchived: !nextState } : t
        )
      );
    });

    if (target) {
      setSuccessToast(
        nextState
          ? `${target.name}'s profile has been archived.`
          : `${target.name}'s profile has been unarchived.`
      );
      setTimeout(() => setSuccessToast(null), 4000);
      if (selectedTherapist?.id === therapistId) {
        setSelectedTherapist({ ...target, isArchived: nextState });
      }
    }
  };

  const handleDeleteTherapist = async (therapistId: string) => {
    const target = therapistsList.find((t) => t.id === therapistId) || therapists?.find((t) => t.id === therapistId);
    const targetName = target?.name || 'Therapist';

    // Optimistic UI update
    setTherapistsList((prev) => prev.filter((t) => t.id !== therapistId));
    if (selectedTherapist?.id === therapistId) {
      setSelectedTherapist(null);
    }

    try {
      if (deleteTherapist) {
        await deleteTherapist(therapistId);
      } else {
        await api.delete(`/api/admin/consultants?id=${encodeURIComponent(therapistId)}`);
      }
      setSuccessToast(`Therapist ${targetName} permanently deleted from database.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Error deleting consultant from DB:', err);
      // Revert optimistic update
      if (target) {
        setTherapistsList((prev) => [target, ...prev]);
        setSuccessToast(`Failed to delete ${targetName}: ${err?.message || 'Database error'}`);
        setTimeout(() => setSuccessToast(null), 5000);
      }
    }
  };

  const getTherapistAverageRating = (therapist: Therapist): number => {
    if (therapist.reviews && therapist.reviews.length > 0) {
      const total = therapist.reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
      const avg = total / therapist.reviews.length;
      return Math.round(avg * 10) / 10;
    }
    return therapist.rating ?? 5.0;
  };

  const assignedClients: Client[] = selectedTherapist
    ? (clients || []).slice(0, 5)
    : [];

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
      {successToast && (
        <div className="fixed top-24 right-8 z-50 bg-emerald-600 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500 animate-fade-in">
          <CheckCircle2 className="w-6 h-6 text-white" />
          <span className="font-extrabold text-xs">{successToast}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-[28px] bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <span className="px-3.5 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase text-purple-200 border border-white/20">
            Therapist Directory
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">Clinical Practitioner Management</h1>
          <p className="text-purple-100 text-sm mt-1 max-w-xl">
            Configure therapist profiles, platform session fees individually per consultant, manage credentials, and inspect clinical outcome workspace.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-3 bg-white text-[#5e2be2] hover:bg-purple-50 rounded-2xl font-extrabold text-sm shadow-xl transition-all hover:scale-105 active:scale-95"
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
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search therapist name or specialization..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
            />
          </div>

          {/* Profession Filter Dropdown */}
          <div className="relative w-full sm:w-64">
            <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <select
              value={selectedProfession}
              onChange={(e) => setSelectedProfession(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-800 outline-none focus:border-[#5e2be2] focus:bg-white appearance-none cursor-pointer transition-all"
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
            className="flex items-center gap-2 px-4 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-2xl font-bold text-xs shadow-md shadow-[#5e2be2]/20 transition-all md:hidden"
          >
            <Plus className="w-4 h-4" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Therapist Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTherapists.map((t) => {
          const isDropdownOpen = activeDropdownId === t.id;
          return (
            <div
              key={t.id}
              className={`bg-white rounded-3xl p-6 border shadow-sm card-hover flex flex-col justify-between space-y-4 relative transition-all ${
                t.isArchived
                  ? 'border-slate-300 bg-slate-100/50 opacity-80'
                  : t.isBookingGreyedOut
                  ? 'border-amber-200 bg-amber-50/20'
                  : t.isHiddenFromLive
                  ? 'border-rose-200 bg-rose-50/20'
                  : 'border-slate-100'
              }`}
            >
              {/* Status indicators */}
              {(t.isBookingGreyedOut || t.isArchived || t.isHiddenFromLive) && (
                <div className="flex flex-wrap gap-1.5 mb-1">
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
                </div>
              )}

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
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5 truncate">
                      <span className="truncate">{t.name}</span>
                      <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                    </h3>
                    <p className="text-xs text-slate-500 font-medium truncate">{t.profession}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-xl">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {getTherapistAverageRating(t).toFixed(1)}
                  </span>

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
                            className="w-full px-3.5 py-2 text-left hover:bg-purple-50 flex items-center gap-2.5 text-[#5e2be2] font-bold transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-[#5e2be2]" />
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
                              if (window.confirm(`Are you sure you want to delete ${t.name}? This will permanently remove the therapist from MongoDB.`)) {
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

              {/* Session Fee & Active Clients Badges */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl text-xs">
                <div className="bg-purple-50/70 p-2 rounded-xl border border-purple-100">
                  <span className="text-[10px] text-purple-600 block font-bold uppercase tracking-wider">Session Fee</span>
                  <span className="font-extrabold text-purple-900 text-sm">
                    ₹{t.services?.[0]?.sessionFee || (t.services?.[0] as any)?.price || (t as any).fees || (t as any).minPrice || t.platformFeePerSession || 2000}/session
                  </span>
                </div>
                <div className="bg-slate-100/70 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-medium">Active Clients</span>
                  <span className="font-bold text-slate-900 text-sm">{t.activeClientsCount || 0} Clients</span>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTherapist(t)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all"
                  >
                    Inspect
                  </button>
                  <button
                    onClick={() => handleStartEdit(t)}
                    className="flex-1 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-bold text-xs shadow-md shadow-[#5e2be2]/20 transition-all text-center"
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
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <img src={selectedTherapist.photo} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-purple-200" />
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{selectedTherapist.name}</h2>
                  <p className="text-xs text-slate-500 font-medium">{selectedTherapist.profession} · License: {selectedTherapist.licenseNumber}</p>
                  {selectedTherapist.email && <p className="text-[11px] text-purple-600 font-bold">{selectedTherapist.email}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
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
                  className="px-4 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-extrabold text-xs shadow-md shadow-[#5e2be2]/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
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
                  Therapist's Clients ({assignedClients.length})
                </button>

                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to permanently delete ${selectedTherapist.name}? This will remove their record from MongoDB.`)) {
                      handleDeleteTherapist(selectedTherapist.id);
                    }
                  }}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Delete therapist permanently"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Profile</span>
                </button>

                <button onClick={() => setSelectedTherapist(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                  <X className="w-5 h-5" />
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
                  ₹{selectedTherapist.platformFeePerSession || 500} <span className="text-xs font-normal text-purple-600">/ session</span>
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
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Clinical Outcome Scores</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-purple-50/60 p-3 rounded-2xl text-center border border-purple-100">
                  <span className="text-[11px] text-slate-500 font-medium block">Improvement Score</span>
                  <span className="text-lg font-extrabold text-purple-700">{selectedTherapist.outcomes?.clientImprovementScore ?? 94}%</span>
                </div>
                <div className="bg-emerald-50/60 p-3 rounded-2xl text-center border border-emerald-100">
                  <span className="text-[11px] text-slate-500 font-medium block">Goal Achievement</span>
                  <span className="text-lg font-extrabold text-emerald-700">{selectedTherapist.outcomes?.goalAchievementRate ?? 88}%</span>
                </div>
                <div className="bg-blue-50/60 p-3 rounded-2xl text-center border border-blue-100">
                  <span className="text-[11px] text-slate-500 font-medium block">Homework Adherence</span>
                  <span className="text-lg font-extrabold text-blue-700">{selectedTherapist.outcomes?.homeworkAdherenceRate ?? 85}%</span>
                </div>
                <div className="bg-amber-50/60 p-3 rounded-2xl text-center border border-amber-100">
                  <span className="text-[11px] text-slate-500 font-medium block">Attendance Rate</span>
                  <span className="text-lg font-extrabold text-amber-700">{selectedTherapist.outcomes?.attendanceRate ?? 92}%</span>
                </div>
              </div>
            </div>

            {/* Bio & Qualifications */}
            <div className="space-y-3 text-xs">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Biography & Clinical Qualifications</h4>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl">{selectedTherapist.about || selectedTherapist.bio || 'Clinical specialist providing evidence-based healthcare and counseling.'}</p>
              
              <div className="space-y-1">
                <span className="font-bold text-slate-500 block">Qualifications:</span>
                <div className="flex flex-wrap gap-2">
                  {(selectedTherapist.qualifications || ["Bachelor's in Psychology", "Licensed Clinical Specialist"]).map((q, idx) => (
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
                <span className="font-extrabold text-slate-700 block uppercase text-[10px]">Clinical Specialties</span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedTherapist.specializations || ['Mental Health', 'Anxiety', 'CBT']).map((s, idx) => (
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
            <div className="p-5 bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] text-white flex items-center justify-between">
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
                    <img src={client.avatar} className="w-8 h-8 rounded-full object-cover" />
                    <div className="truncate">
                      <p className="text-xs font-bold truncate">{client.name}</p>
                      <p className="text-[10px] text-slate-400">{client.service}</p>
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
                        <p className="text-xs text-slate-500">{activeClientInWorkspace.email} · {activeClientInWorkspace.phone}</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full">
                        {activeClientInWorkspace.status}
                      </span>
                    </div>

                    {/* AI Intake Summary */}
                    <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100 space-y-2">
                      <h4 className="text-xs font-extrabold text-[#5e2be2] uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        AI Intake Summary
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {activeClientInWorkspace.aiIntakeSummary}
                      </p>
                    </div>

                    {/* Therapy Goals */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Therapy Goals</h4>
                      <div className="space-y-1.5">
                        {activeClientInWorkspace.therapyGoals.map((goal, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl text-xs font-medium text-slate-800 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>{goal}</span>
                          </div>
                        ))}
                      </div>
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
                  <div className="flex items-center gap-2.5 text-[#5e2be2]">
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
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Email *</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Identifier *</label>
                      <input
                        type="text"
                        placeholder="e.g., john-doe"
                        value={formData.identifier}
                        onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Top Consultant Number</label>
                      <input
                        type="number"
                        placeholder="e.g., 1 (Top Ranking)"
                        value={formData.sequence}
                        onChange={(e) => setFormData({ ...formData, sequence: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Notification Title</label>
                      <input
                        type="text"
                        placeholder="Title used for notifications"
                        value={formData.notificationTitle}
                        onChange={(e) => setFormData({ ...formData, notificationTitle: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Profession *</label>
                      <select
                        value={formData.profession}
                        onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
                      >
                        <option value="">Select a profession</option>
                        {mockProfessions.map((p) => (
                          <option key={p.id} value={p.serviceName}>
                            {p.serviceName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Photo URL *</label>
                      <input
                        type="text"
                        placeholder="https://example.com/photo.jpg"
                        value={formData.photo}
                        onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Photo Alt Text *</label>
                      <input
                        type="text"
                        placeholder="Description of the photo"
                        value={formData.photoAltText}
                        onChange={(e) => setFormData({ ...formData, photoAltText: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
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
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 2: DETAILS */}
              {activeSection === 'details' && (
                <div id="sec-details" className="space-y-6 pt-2 pb-8 animate-slide-in">
                  <div className="flex items-center gap-2.5 text-[#5e2be2]">
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
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
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
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
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
                        className="w-4 h-4 text-[#5e2be2] rounded focus:ring-[#5e2be2]"
                      />
                      <label htmlFor="isCertifiedCheckboxAligned" className="text-xs font-bold text-slate-800 cursor-pointer">
                        Is Certified
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">YouTube URL</label>
                      <input
                        type="url"
                        placeholder="https://youtube.com/..."
                        value={formData.youtubeUrl}
                        onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
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
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white"
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
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white"
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
                  <div className="flex items-center gap-2.5 text-[#5e2be2]">
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
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white"
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
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-[#5e2be2]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase">Certificate Verification URL</label>
                              <input
                                type="url"
                                placeholder="https://..."
                                value={cert.url}
                                onChange={(e) => handleUpdateCertificateUrl(idx, e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-[#5e2be2]"
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

              {/* SECTION 4: SERVICES & PLATFORM FEE */}
              {activeSection === 'services' && (
                <div id="sec-services" className="space-y-6 pt-2 pb-8 animate-slide-in">
                  <div className="flex items-center gap-2.5 text-[#5e2be2]">
                    <DollarSign className="w-5 h-5" />
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Services & Platform Fee</h3>
                      <p className="text-xs text-slate-500 font-medium">Manage services offered by this consultant and configure individual platform fee per session</p>
                    </div>
                  </div>

                  {/* INDIVIDUAL PLATFORM FEE PER SESSION FIELD */}
                  <div className="bg-purple-50/80 p-4 sm:p-5 rounded-2xl border border-purple-200/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                      <div>
                        <h4 className="text-sm font-extrabold text-purple-900 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-[#5e2be2] shrink-0" />
                          <span>Individual Platform Fee Per Session</span>
                        </h4>
                        <p className="text-xs text-purple-700 font-medium leading-relaxed">
                          Set the separate platform commission/fee charged for each session booked with this therapist.
                        </p>
                      </div>
                      <span className="self-start sm:self-auto px-3 py-1 bg-purple-200 text-purple-900 rounded-full text-[10px] font-extrabold uppercase tracking-wide shrink-0">
                        Per Therapist Config
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Calculation Type */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-purple-900">Platform Fee Calculation Type</label>
                        <select
                          value={formData.platformFeeType}
                          onChange={(e) => handlePlatformFeeChange(formData.platformFeePerSession, e.target.value as 'Fixed' | 'Percentage')}
                          className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm font-bold text-purple-900 outline-none focus:border-[#5e2be2]"
                        >
                          <option value="Fixed">Fixed Amount per session (₹)</option>
                          <option value="Percentage">Percentage of session fee (%)</option>
                        </select>
                      </div>

                      {/* Fee Value Input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-purple-900">
                          {formData.platformFeeType === 'Percentage' ? 'Platform Fee Percentage (%) *' : 'Platform Fee Amount (₹) *'}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max={formData.platformFeeType === 'Percentage' ? 100 : undefined}
                            value={formData.platformFeePerSession}
                            onChange={(e) => handlePlatformFeeChange(e.target.value, formData.platformFeeType as 'Fixed' | 'Percentage')}
                            onInput={(e: React.FormEvent<HTMLInputElement>) => {
                              if (formData.platformFeeType === 'Percentage') {
                                const num = Number(e.currentTarget.value);
                                if (num > 100) {
                                  e.currentTarget.value = '100';
                                  handlePlatformFeeChange('100', 'Percentage');
                                }
                              }
                            }}
                            placeholder={formData.platformFeeType === 'Percentage' ? 'e.g. 20' : 'e.g. 500'}
                            className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm font-bold text-purple-900 outline-none focus:border-[#5e2be2]"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-extrabold text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-md">
                            {formData.platformFeeType === 'Percentage' ? '%' : '₹'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live Financial Breakdown Preview Box */}
                    <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-purple-200/90 shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                        <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                          Live Calculation Preview (Assuming ₹2,000 Session Fee)
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 self-start sm:self-auto">
                          Net Payout = Session Fee - Platform Fee
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1 text-center">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Client Pays</span>
                          <span className="text-sm font-extrabold text-slate-900">₹2,000</span>
                        </div>
                        <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                          <span className="text-[10px] text-purple-700 font-bold block uppercase">
                            Platform Fee {formData.platformFeeType === 'Percentage' ? `(${formData.platformFeePerSession || 0}%)` : '(Fixed)'}
                          </span>
                          <span className="text-sm font-extrabold text-[#5e2be2]">
                            ₹{formData.platformFeeType === 'Percentage' 
                              ? Math.round((2000 * (Number(formData.platformFeePerSession) || 0)) / 100) 
                              : (Number(formData.platformFeePerSession) || 0)}
                          </span>
                        </div>
                        <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                          <span className="text-[10px] text-emerald-700 font-bold block uppercase">Therapist Earns</span>
                          <span className="text-sm font-extrabold text-emerald-800">
                            ₹{Math.max(0, 2000 - (formData.platformFeeType === 'Percentage' 
                              ? Math.round((2000 * (Number(formData.platformFeePerSession) || 0)) / 100) 
                              : (Number(formData.platformFeePerSession) || 0)))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* List of Configured Services */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                        Configured Services ({formData.services.length})
                      </span>
                    </div>

                    {formData.services.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <p className="text-xs font-semibold text-slate-400">No services added yet. Click "Add Service" below.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.services.map((srv, index) => (
                          <div key={srv.id} className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm relative">
                            {/* Header Label & Financial Badges */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                Service Item #{index + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-extrabold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 flex items-center gap-1">
                                  <span>Platform Fee:</span>
                                  <span className="font-mono text-xs text-[#5e2be2]">₹{srv.platformFee}</span>
                                  <span className="text-[9px] text-purple-500 font-semibold">
                                    ({formData.platformFeeType === 'Percentage' ? `${formData.platformFeePerSession}%` : 'Fixed'})
                                  </span>
                                </span>
                                <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                                  <span>Therapist Net:</span>
                                  <span className="font-mono text-xs text-emerald-800">
                                    ₹{Math.max(0, srv.sessionFee - srv.platformFee)}
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* Grid 1: Name and Platform */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-slate-700">Service Name *</label>
                                <input
                                  type="text"
                                  placeholder="e.g., 1-on-1 Consultation"
                                  value={srv.serviceName}
                                  onChange={(e) => handleUpdateServiceField(srv.id, 'serviceName', e.target.value)}
                                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all text-slate-800"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-slate-700">Platform *</label>
                                <select
                                  value={srv.platform || 'Google Meet'}
                                  onChange={(e) => handleUpdateServiceField(srv.id, 'platform', e.target.value)}
                                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all text-slate-800"
                                >
                                  <option value="Google Meet">Google Meet</option>
                                  <option value="Zoom">Zoom</option>
                                  <option value="In Person">In Person</option>
                                  <option value="Phone Call">Phone Call</option>
                                </select>
                              </div>
                            </div>

                            {/* Grid 2: Price, Duration, Sessions */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-slate-700">Price (₹) *</label>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={srv.sessionFee}
                                  onChange={(e) => handleUpdateServiceField(srv.id, 'sessionFee', Number(e.target.value))}
                                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all text-slate-800"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-slate-700">Duration (mins) *</label>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="60"
                                  value={srv.durationMinutes}
                                  onChange={(e) => handleUpdateServiceField(srv.id, 'durationMinutes', Number(e.target.value))}
                                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all text-slate-800"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-extrabold text-slate-700">Sessions *</label>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  value={srv.sessions || 1}
                                  onChange={(e) => handleUpdateServiceField(srv.id, 'sessions', Number(e.target.value))}
                                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all text-slate-800"
                                />
                              </div>
                            </div>

                            {/* Remove button */}
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    services: prev.services.filter((s) => s.id !== srv.id)
                                  }))
                                }
                                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors active:scale-95"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remove Service
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Service Trigger Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleAddService}
                        className="flex items-center gap-1.5 px-5 py-2.5 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-800 transition-colors shadow-xs"
                      >
                        <Plus className="w-4 h-4 text-slate-800" />
                        Add Service
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 5: CLIENT REVIEWS */}
              {activeSection === 'reviews' && (
                <div id="sec-reviews" className="space-y-6 pt-2 pb-8 animate-slide-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5 text-[#5e2be2]">
                      <Star className="w-5 h-5" />
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">Client Reviews</h3>
                        <p className="text-xs text-slate-500 font-medium">Add and manage client reviews and testimonials</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddReview}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 shrink-0"
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
                      {formData.reviews.map((rev, index) => (
                        <div
                          key={rev.id}
                          className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-5 relative"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-purple-100 text-[#5e2be2] flex items-center justify-center text-[10px]">
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
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] text-slate-800 placeholder:text-slate-400"
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
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] text-slate-800 placeholder:text-slate-400"
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
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] text-slate-800"
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
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] text-slate-800"
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
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] text-slate-800 placeholder:text-slate-400 leading-relaxed resize-y"
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
                                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-[#5e2be2]"
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
                        className="w-full py-3.5 border-2 border-dashed border-[#5e2be2]/30 hover:border-[#5e2be2]/60 text-[#5e2be2] hover:bg-purple-50/40 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all"
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
                  <div className="flex items-center gap-2.5 text-[#5e2be2]">
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
                              <h4 className="text-xs font-extrabold text-[#5e2be2]">Edit FAQ Item</h4>
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
                                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#5e2be2]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-500 uppercase">Answer</label>
                              <textarea
                                rows={3}
                                value={f.answer}
                                onChange={(e) => handleUpdateFAQField(f.id, 'answer', e.target.value)}
                                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5e2be2] resize-y"
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingFAQId(null)}
                                className="px-4 py-1.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white text-xs font-extrabold rounded-xl transition-colors shadow-xs"
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
                                className="p-1.5 hover:bg-purple-50 text-slate-400 hover:text-[#5e2be2] rounded-lg transition-colors"
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
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5e2be2]"
                      />
                      <textarea
                        rows={2}
                        placeholder="Answer details..."
                        value={newFAQ.answer}
                        onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#5e2be2] resize-none"
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
                          className="px-4 py-1.5 bg-[#5e2be2] text-white text-xs font-bold rounded-xl"
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
                  <div className="flex items-center gap-2.5 text-[#5e2be2]">
                    <Building2 className="w-5 h-5" />
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Banking & Payout Details</h3>
                      <p className="text-xs text-slate-500 font-medium">Configure bank transfer and UPI credentials for consultant disbursals</p>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50/70 border border-purple-150 rounded-2xl flex items-start gap-3 text-purple-950">
                    <CheckCircle2 className="w-5 h-5 text-[#5e2be2] shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <p className="font-extrabold text-slate-900">Persistent Disbursal Configuration</p>
                      <p className="text-purple-700 mt-0.5">
                        These details only need to be entered once and are stored permanently in MongoDB Atlas. Whenever this consultant is selected for payout release, these bank and UPI coordinates are automatically pre-filled.
                      </p>
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
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 50100429182371"
                        value={formData.bankAccountNumber}
                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC0001234"
                        value={formData.bankIfsc}
                        onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold uppercase outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">Beneficiary / Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Marcus Vance"
                        value={formData.accountHolderName}
                        onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-extrabold text-slate-700">UPI ID / Virtual Payment Address (VPA)</label>
                      <input
                        type="text"
                        placeholder="e.g. drmarcusvance@okaxis or 9876543210@upi"
                        value={formData.upiId}
                        onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-medium outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
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
                    <div className="flex items-center gap-2.5 text-[#5e2be2]">
                      <Globe className="w-5 h-5" />
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">SEO Settings</h3>
                        <p className="text-xs text-slate-500 font-medium">Search engine optimization and social sharing configuration for consultant landing page</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-purple-50 text-[#5e2be2] rounded-full text-[10px] font-extrabold uppercase tracking-wide border border-purple-100">
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
                            placeholder="e.g. Dr. John Doe | Clinical Psychologist in New York"
                            value={formData.seo.metaTitle}
                            onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, metaTitle: e.target.value } })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#5e2be2] focus:bg-white transition-all font-medium text-slate-800"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-slate-700">Meta Description</label>
                          <textarea
                            rows={3}
                            placeholder="Book therapy sessions with Dr. John Doe..."
                            value={formData.seo.metaDescription}
                            onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, metaDescription: e.target.value } })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#5e2be2] focus:bg-white transition-all resize-none font-medium text-slate-800"
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
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#5e2be2] focus:bg-white transition-all font-medium text-slate-800"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700">Canonical URL</label>
                            <input
                              type="url"
                              placeholder="https://hexpertify.com/consultants/john-doe"
                              value={formData.seo.canonicalUrl}
                              onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, canonicalUrl: e.target.value } })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#5e2be2] focus:bg-white transition-all font-medium text-slate-800"
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
                                ogTitle: formData.seo.ogTitle || formData.seo.metaTitle || (formData.name ? `${formData.name.trim().startsWith('Dr.') ? formData.name.trim() : 'Dr. ' + formData.name.trim()} | ${formData.profession || 'Therapist'}` : ''),
                                ogDescription: formData.seo.ogDescription || formData.seo.metaDescription || (formData.about ? formData.about.trim().slice(0, 150) + '...' : '')
                              }
                            })}
                            className="flex items-center gap-1 text-[10px] font-extrabold text-[#5e2be2] bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-100 transition-all active:scale-95"
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
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#5e2be2] focus:bg-white transition-all font-medium text-slate-800"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-slate-700">OG Description</label>
                          <textarea
                            rows={2}
                            placeholder="Social share description..."
                            value={formData.seo.ogDescription}
                            onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, ogDescription: e.target.value } })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#5e2be2] focus:bg-white transition-all resize-none font-medium text-slate-800"
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
                                className="text-[10px] font-bold text-[#5e2be2] hover:underline"
                              >
                                Use Profile Photo
                              </button>
                            </div>
                            <input
                              type="url"
                              placeholder="https://..."
                              value={formData.seo.ogImageUrl}
                              onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, ogImageUrl: e.target.value } })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#5e2be2] focus:bg-white transition-all font-medium text-slate-800"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-700">OG Image Alt Text</label>
                            <input
                              type="text"
                              placeholder="Image description..."
                              value={formData.seo.ogImageAltText}
                              onChange={(e) => setFormData({ ...formData, seo: { ...formData.seo, ogImageAltText: e.target.value } })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#5e2be2] focus:bg-white transition-all font-medium text-slate-800"
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
                              {formData.seo.metaTitle || (formData.name ? `${formData.name.trim().startsWith('Dr.') ? formData.name.trim() : 'Dr. ' + formData.name.trim()} | ${formData.profession || 'Therapist'}` : 'Dr. John Doe | Clinical Practitioner')}
                            </h5>
                            <p className="text-xs text-slate-655 leading-relaxed line-clamp-2">
                              {formData.seo.metaDescription || (formData.about ? formData.about.trim().slice(0, 150) + '...' : 'Book clinical consultation sessions with our licensed therapist on Hexpertify platform. Dedicated mental health care and recovery.')}
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
                              {formData.seo.ogTitle || formData.seo.metaTitle || (formData.name ? `${formData.name.trim().startsWith('Dr.') ? formData.name.trim() : 'Dr. ' + formData.name.trim()} | ${formData.profession || 'Therapist'}` : 'Dr. John Doe | Clinical Practitioner')}
                            </h5>
                            <p className="text-xs text-slate-500 font-medium leading-normal line-clamp-2 font-medium">
                              {formData.seo.ogDescription || formData.seo.metaDescription || (formData.about ? formData.about.trim().slice(0, 150) + '...' : 'Book clinical consultation sessions with our licensed therapist on Hexpertify platform. Dedicated mental health care and recovery.')}
                            </p>
                          </div>
                        </div>
                      )}



                      {/* SEO Quality Helper Card */}
                      <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-blue-50/70 p-5 rounded-2xl border border-purple-100 space-y-3">
                        <h5 className="text-[11px] font-extrabold text-[#5e2be2] uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#5e2be2]" />
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
                    type="button"
                    onClick={handleNextStep}
                    className="px-8 py-3 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-extrabold text-xs shadow-lg shadow-[#5e2be2]/30 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="create-consultant-form"
                    className="px-8 py-3 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-extrabold text-xs shadow-lg shadow-[#5e2be2]/30 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {editingTherapistId ? 'Update Profile' : 'Create Consultant'}
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
