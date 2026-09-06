import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Upload,
  File,
  X,
  Image as ImageIcon,
  Layers,
  Trash2,
  CheckCircle2,
  Search,
  CloudUpload,
  Eye,
  Briefcase,
  BookOpen,
  UserCheck,
  User,
  Award,
  Copy,
  Check,
  Link,
  FileText,
  Film,
  Music,
  StickyNote,
  Loader2
} from 'lucide-react';
import type { MediaAsset } from '../types';

export const AssetsView: React.FC = () => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch live assets from MongoDB Atlas on mount
  React.useEffect(() => {
    setIsLoading(true);
    const fetchAssets = async () => {
      try {
        let res = await fetch('/api/admin/assets').catch(() => null);
        if (!res || !res.ok) {
          res = await fetch('http://localhost:5000/api/admin/assets').catch(() => null);
        }
        if (res && res.ok) {
          const data = await res.json();
          if (data?.assets && Array.isArray(data.assets)) {
            setAssets(data.assets);
          }
        }
      } catch (err) {
        console.error('Error fetching live assets:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssets();
  }, []);

  // Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Form Fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [assetName, setAssetName] = useState<string>('');
  const [assetCategory, setAssetCategory] = useState<MediaAsset['type']>('Professional');

  // Preview Modal
  const [activePreviewAsset, setActivePreviewAsset] = useState<MediaAsset | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['All', 'Banner', 'Consultant', 'Icon', 'Professional', 'Client', 'Certificate', 'Blog', 'PDF File', 'Video', 'Audio', 'Other'];

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyUrl = (url: string, assetName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    triggerToast(`URL for "${assetName}" copied to clipboard!`);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  // Handle Drag & Drop Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    if (!assetName) {
      setAssetName(file.name);
    }

    // Auto detect category from file type
    if (file.type.startsWith('image/')) {
      setAssetCategory('Banner');
    } else if (file.type.startsWith('video/')) {
      setAssetCategory('Video');
    } else if (file.type.startsWith('audio/')) {
      setAssetCategory('Audio');
    } else if (file.type.includes('pdf')) {
      setAssetCategory('PDF File');
    } else if (file.name.endsWith('.txt') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      setAssetCategory('Other');
    } else {
      setAssetCategory('Other');
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleOpenModal = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setAssetName('');
    setAssetCategory('Banner');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setPreviewUrl('');
    setAssetName('');
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assetName.trim()) {
      alert('Please enter an asset name.');
      return;
    }

    const fileSizeFormatted = selectedFile
      ? (selectedFile.size / (1024 * 1024)).toFixed(1) + ' MB'
      : '1.2 MB';

    const generatedUrl = previewUrl || `https://res.cloudinary.com/ddgvdabyf/image/upload/v1766863367/uploads/${assetName.trim().replace(/\s+/g, '_')}.webp`;

    const newAsset: MediaAsset = {
      id: `AST-${Date.now()}`,
      name: assetName.trim(),
      type: assetCategory,
      url: generatedUrl,
      size: fileSizeFormatted,
      uploadedDate: new Date().toISOString().split('T')[0],
      category: assetCategory
    };

    // Persist to MongoDB Atlas
    fetch("/api/admin/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAsset)
    }).catch(() => {
      fetch("http://localhost:5000/api/admin/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAsset)
      }).catch((err) => console.error("Error creating asset in DB:", err));
    });

    setAssets([newAsset, ...assets]);
    handleCloseModal();
    setActivePreviewAsset(newAsset);
    triggerToast(`Asset uploaded to MongoDB Atlas! URL copied.`);
    navigator.clipboard.writeText(generatedUrl);
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete asset "${name}" from MongoDB Atlas?`)) {
      try {
        let res = await fetch(`/api/admin/assets?id=${encodeURIComponent(id)}`, {
          method: "DELETE"
        }).catch(() => null);
        if (!res || !res.ok) {
          await fetch(`http://localhost:5000/api/admin/assets?id=${encodeURIComponent(id)}`, {
            method: "DELETE"
          }).catch(() => null);
        }
        setAssets((prev) => prev.filter((a) => a.id !== id));
        triggerToast(`Asset "${name}" deleted from MongoDB Atlas.`);
      } catch (err) {
        console.error("Error deleting asset:", err);
        setAssets((prev) => prev.filter((a) => a.id !== id));
        triggerToast(`Asset deleted.`);
      }
    }
  };

  // Filtered Assets
  const filteredAssets = assets.filter((a) => {
    const matchesCat = selectedCategory === 'All' || a.type === selectedCategory || a.category === selectedCategory;
    const matchesQuery =
      (a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const getCategoryIcon = (type: MediaAsset['type']) => {
    switch (type) {
      case 'Professional':
        return <Briefcase className="w-5 h-5 text-purple-600" />;
      case 'Blog':
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case 'Consultant':
        return <UserCheck className="w-5 h-5 text-indigo-600" />;
      case 'Client':
        return <User className="w-5 h-5 text-emerald-600" />;
      case 'Icon':
        return <Layers className="w-5 h-5 text-amber-600" />;
      case 'Certificate':
        return <Award className="w-5 h-5 text-rose-600" />;
      case 'Banner':
        return <ImageIcon className="w-5 h-5 text-purple-600" />;
      case 'PDF File':
        return <FileText className="w-5 h-5 text-rose-600" />;
      case 'Video':
        return <Film className="w-5 h-5 text-blue-600" />;
      case 'Audio':
        return <Music className="w-5 h-5 text-amber-600" />;
      case 'Notes':
        return <StickyNote className="w-5 h-5 text-emerald-600" />;
      case 'Other':
        return <File className="w-5 h-5 text-slate-500" />;
      default:
        return <File className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-8 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-bold text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Hero Header matching Home Page card gradient */}
      <div className="relative rounded-[28px] bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <span className="px-3.5 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase text-purple-200 border border-white/20">
            Media Vault & Assets CMS
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">Central Platform Assets Vault</h1>
          <p className="text-purple-100 text-sm mt-1 max-w-xl">
            Store, replace, organize, and manage website banners, therapy worksheets, audio guides, and videos.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="relative z-10 px-6 py-3 bg-white text-[#4f28d9] hover:bg-purple-50 rounded-2xl font-extrabold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Asset</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto bg-white p-2 rounded-2xl border border-slate-100 shadow-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/20 font-extrabold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assets by name or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:border-[#5e2be2] focus:ring-1 focus:ring-[#5e2be2]/10 transition-all"
          />
        </div>
      </div>

      {/* Asset Cards Grid */}
      {isLoading ? (
        <div className="text-center py-24 bg-white border border-slate-100 rounded-3xl space-y-3">
          <Loader2 className="w-10 h-10 text-[#5e2be2] animate-spin mx-auto" />
          <p className="text-sm font-extrabold text-slate-800">Loading Live Assets from Database...</p>
          <p className="text-xs text-slate-400">Fetching high-resolution Cloudinary media vault records</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl space-y-3">
          <File className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-extrabold text-slate-700">No assets found</p>
          <p className="text-xs text-slate-400">Try adjusting your search query or upload a new asset.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAssets.map((ast) => (
            <div
              key={ast.id}
              className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between group relative"
            >
              {/* Media Thumbnail Container */}
              <div className="h-36 bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center relative border border-slate-100 group-hover:border-purple-200 transition-colors">
                {ast.url && (ast.url.startsWith('http') || ast.url.startsWith('data:')) && (ast.type === 'Banner' || ast.type === 'Consultant' || ast.type === 'Icon' || ast.type === 'Professional' || ast.type === 'Certificate' || ast.type === 'Blog' || ast.type === 'Images' || ast.url.includes('cloudinary.com') || ast.url.match(/\.(webp|png|jpg|jpeg|svg|gif)($|\?)/i)) ? (
                  <img
                    src={ast.url}
                    alt={ast.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    {getCategoryIcon(ast.type)}
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      {ast.type}
                    </span>
                  </div>
                )}

                {/* Hover Quick Actions */}
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleCopyUrl(ast.url.startsWith('#') ? `https://assets.hexpertify.com/uploads/${ast.name}` : ast.url, ast.name, e)}
                    className="px-3 py-1.5 bg-white text-[#5e2be2] hover:bg-purple-50 rounded-xl font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                    title="Copy Direct Asset URL"
                  >
                    {copiedUrl === (ast.url.startsWith('#') ? `https://assets.hexpertify.com/uploads/${ast.name}` : ast.url) ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedUrl === (ast.url.startsWith('#') ? `https://assets.hexpertify.com/uploads/${ast.name}` : ast.url) ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePreviewAsset(ast)}
                    className="p-2 bg-white/90 hover:bg-white text-slate-900 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                    title="Preview Asset"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAsset(ast.id, ast.name)}
                    className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                    title="Delete Asset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Badge */}
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-extrabold text-slate-700 shadow-xs border border-slate-100">
                  {ast.type}
                </div>
              </div>

              {/* Asset Info & 1-Click Copy URL Bar */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-extrabold text-slate-900 text-xs truncate leading-snug" title={ast.name}>
                    {ast.name}
                  </p>
                </div>

                {/* Direct Generated URL Pill */}
                <div className="flex items-center justify-between gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-mono text-slate-500 truncate flex-1 pl-1" title={ast.url.startsWith('#') ? `https://assets.hexpertify.com/uploads/${ast.name}` : ast.url}>
                    {ast.url.startsWith('#') ? `https://assets.hexpertify.com/uploads/${ast.name}` : ast.url}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCopyUrl(ast.url.startsWith('#') ? `https://assets.hexpertify.com/uploads/${ast.name}` : ast.url, ast.name, e)}
                    className="p-1 hover:bg-purple-100 text-[#5e2be2] rounded-lg transition-colors shrink-0"
                    title="Copy URL"
                  >
                    {copiedUrl === (ast.url.startsWith('#') ? `https://assets.hexpertify.com/uploads/${ast.name}` : ast.url) ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── UPLOAD ASSET MODAL ───────────────────────────────────────── */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 p-4 sm:p-6 space-y-4 sm:space-y-6 animate-scale-up overflow-hidden my-auto max-h-[94vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-[#5e2be2] rounded-2xl border border-purple-100">
                  <CloudUpload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Upload New Asset</h3>
                  <p className="text-xs text-slate-400 font-medium">Add media files to the central platform vault</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="space-y-5 text-xs">
              {/* 1. Drag & Drop Zone */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 block">Upload File (Drag & Drop) *</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    isDragOver
                      ? 'border-[#5e2be2] bg-purple-50/60 scale-[1.01]'
                      : selectedFile || previewUrl
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileInputChange}
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  />

                  {previewUrl ? (
                    <div className="space-y-2 flex flex-col items-center">
                      {assetCategory === 'Images' ? (
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-xs relative">
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="p-3 bg-purple-100 text-[#5e2be2] rounded-2xl">
                          {getCategoryIcon(assetCategory)}
                        </div>
                      )}
                      <p className="font-bold text-slate-800 text-xs truncate max-w-xs">
                        {selectedFile ? selectedFile.name : 'File attached'}
                      </p>
                      <span className="text-[10px] text-purple-600 font-extrabold bg-purple-100/60 px-2 py-0.5 rounded-full">
                        Click or drag to replace
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-[#5e2be2]/10 text-[#5e2be2] rounded-2xl">
                        <CloudUpload className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800 text-sm">
                          Drag and drop your image / file here
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          or <span className="text-[#5e2be2] font-bold underline">browse file</span> from your device
                        </p>
                      </div>
                      <p className="text-[9px] text-slate-400 font-mono">Supports PNG, JPG, WEBP, MP4, MP3, PDF (Max 50MB)</p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. Asset Name Field */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 block">Asset Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Mindfulness_Guide_Banner.png"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] transition-all"
                  required
                />
              </div>

              {/* 3. Category Field */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 block">Category Type *</label>
                <select
                  value={assetCategory}
                  onChange={(e) => setAssetCategory(e.target.value as MediaAsset['type'])}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] transition-all"
                >
                  <option value="Professional">Professional</option>
                  <option value="Blog">Blog</option>
                  <option value="Consultant">Consultant</option>
                  <option value="Client">Client</option>
                  <option value="Icon">Icon</option>
                  <option value="Certificate">Certificate</option>
                  <option value="Banner">Banner</option>
                  <option value="PDF File">PDF File</option>
                  <option value="Video">Video</option>
                  <option value="Audio">Audio</option>
                  <option value="Notes">Notes</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-extrabold shadow-md shadow-[#5e2be2]/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Asset</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── PREVIEW ASSET DRAWER MODAL ───────────────────────── */}
      {activePreviewAsset && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 p-4 sm:p-6 space-y-4 sm:space-y-5 animate-scale-up my-auto max-h-[94vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{activePreviewAsset.name}</h3>
                <p className="text-xs text-slate-400">{activePreviewAsset.type} · {activePreviewAsset.size}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewAsset(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-64 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200">
              {activePreviewAsset.type === 'Images' || activePreviewAsset.url.startsWith('http') ? (
                <img src={activePreviewAsset.url} alt={activePreviewAsset.name} className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  {getCategoryIcon(activePreviewAsset.type)}
                  <span className="text-xs font-bold text-slate-500">{activePreviewAsset.name}</span>
                </div>
              )}
            </div>

            {/* Generated Direct Asset URL */}
            <div className="space-y-1.5 bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100">
              <label className="text-xs font-extrabold text-[#5e2be2] flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5" />
                Generated Direct Asset URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={activePreviewAsset.url.startsWith('#') ? `https://assets.hexpertify.com/uploads/${activePreviewAsset.name}` : activePreviewAsset.url}
                  className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopyUrl(activePreviewAsset.url.startsWith('#') ? `https://assets.hexpertify.com/uploads/${activePreviewAsset.name}` : activePreviewAsset.url, activePreviewAsset.name)}
                  className="px-4 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-[#5e2be2]/20 transition-all active:scale-95 shrink-0"
                >
                  {copiedUrl === (activePreviewAsset.url.startsWith('#') ? `https://assets.hexpertify.com/uploads/${activePreviewAsset.name}` : activePreviewAsset.url) ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-slate-400 font-medium">Uploaded: {activePreviewAsset.uploadedDate}</span>
              <button
                type="button"
                onClick={() => {
                  handleDeleteAsset(activePreviewAsset.id, activePreviewAsset.name);
                  setActivePreviewAsset(null);
                }}
                className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-extrabold rounded-xl transition-all"
              >
                Delete Asset
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
