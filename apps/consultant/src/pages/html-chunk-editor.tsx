import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import {
  ArrowLeft,
  Save,
  Globe,
  Eye,
  History,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Lock,
  Code,
  Sparkles,
  Check,
  AlertCircle,
  Search,
  Layout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HtmlChunkPreviewModal } from "@/components/html-chunk-preview";
import { HtmlChunkVersionModal } from "@/components/html-chunk-version-modal";
import { useToast } from "@/hooks/use-toast";

interface Chunk {
  id: string;
  name: string;
  type: string;
  content: string;
  order: number;
}

interface SeoDetails {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogAltText: string;
  robotsIndexing: string;
  structuredData?: string;
}

const PRESET_CHUNKS: Array<{ type: string; name: string; icon: string; defaultContent: string }> = [
  {
    type: "faq",
    name: "FAQ Accordion",
    icon: "❓",
    defaultContent: `
<div class="max-w-3xl mx-auto my-8 space-y-4">
  <h2 class="text-2xl font-bold text-gray-900 text-center mb-6">Frequently Asked Questions</h2>
  <div class="p-5 border rounded-xl bg-white shadow-sm">
    <h4 class="font-bold text-gray-900 mb-2">How are Hexpertify custom pages integrated?</h4>
    <p class="text-gray-600 text-sm">All custom pages render under your central site header and footer without requiring code changes.</p>
  </div>
  <div class="p-5 border rounded-xl bg-white shadow-sm">
    <h4 class="font-bold text-gray-900 mb-2">Is SEO metadata supported?</h4>
    <p class="text-gray-600 text-sm">Yes, you can configure Open Graph metadata, canonical URLs, and robots indexing directly in the editor.</p>
  </div>
</div>
    `.trim(),
  },
];

export default function HtmlChunkEditor() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/html-chunk-pages/:id/edit");
  const isEditing = !!params?.id;
  const pageId = params?.id ? parseInt(params.id, 10) : null;
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [identifierUrl, setIdentifierUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [summaryOfChanges, setSummaryOfChanges] = useState("");
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // SEO details
  const [seo, setSeo] = useState<SeoDetails>({
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    canonicalUrl: "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    ogAltText: "",
    robotsIndexing: "index, follow",
    structuredData: "",
  });

  // Identifier URL validation error
  const [urlError, setUrlError] = useState<string | null>(null);

  // Modals state
  const [showPreview, setShowPreview] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  useEffect(() => {
    if (isEditing && pageId) {
      fetchPageDetails(pageId);
    }
  }, [isEditing, pageId]);

  const fetchPageDetails = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/html-chunks/pages/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || "");
        setIdentifierUrl(data.identifierUrl || "");
        setStatus(data.status || "draft");
        setChunks(data.chunks || []);
        if (data.seoDetails) {
          setSeo({
            metaTitle: data.seoDetails.metaTitle || "",
            metaDescription: data.seoDetails.metaDescription || "",
            metaKeywords: data.seoDetails.metaKeywords || "",
            canonicalUrl: data.seoDetails.canonicalUrl || "",
            ogTitle: data.seoDetails.ogTitle || "",
            ogDescription: data.seoDetails.ogDescription || "",
            ogImage: data.seoDetails.ogImage || "",
            ogAltText: data.seoDetails.ogAltText || "",
            robotsIndexing: data.seoDetails.robotsIndexing || "index, follow",
            structuredData: data.seoDetails.structuredData || "",
          });
        }
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to load page details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Validate Identifier URL according to rules
  const handleIdentifierUrlChange = (val: string) => {
    setIdentifierUrl(val);
    if (!val) {
      setUrlError("Identifier URL is required.");
      return;
    }
    if (/\s/.test(val)) {
      setUrlError("Cannot contain spaces.");
      return;
    }
    const validRegex = /^[a-z0-9-]+$/;
    if (!validRegex.test(val)) {
      setUrlError("Only lowercase letters, numbers, and hyphens (-) allowed.");
      return;
    }
    setUrlError(null);
  };

  // Auto slug generation from title if creating new
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing && (!identifierUrl || identifierUrl === slugify(title))) {
      const generated = slugify(val);
      setIdentifierUrl(generated);
      handleIdentifierUrlChange(generated);
    }
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const addChunkFromPreset = (preset: typeof PRESET_CHUNKS[0]) => {
    const newChunk: Chunk = {
      id: `chunk-${Date.now()}`,
      name: preset.name,
      type: preset.type,
      content: preset.defaultContent,
      order: chunks.length + 1,
    };
    setChunks([...chunks, newChunk]);
    toast({ title: "Chunk Added", description: `Added "${preset.name}"` });
  };

  const updateChunkContent = (id: string, newContent: string) => {
    setChunks(chunks.map((c) => (c.id === id ? { ...c, content: newContent } : c)));
  };

  const moveChunk = (index: number, direction: "up" | "down") => {
    const newChunks = [...chunks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newChunks.length) return;

    const temp = newChunks[index];
    newChunks[index] = newChunks[targetIndex];
    newChunks[targetIndex] = temp;

    // re-assign orders
    const reordered = newChunks.map((c, i) => ({ ...c, order: i + 1 }));
    setChunks(reordered);
  };

  const removeChunk = (id: string) => {
    setChunks(chunks.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i + 1 })));
  };

  const handleSave = async (targetStatus?: "draft" | "published") => {
    if (!title.trim()) {
      toast({ title: "Validation Error", description: "Page Title is required.", variant: "destructive" });
      return;
    }

    if (urlError) {
      toast({ title: "Validation Error", description: urlError, variant: "destructive" });
      return;
    }

    setSaving(true);

    const payload = {
      title,
      identifierUrl,
      status: targetStatus || status,
      seoDetails: seo,
      chunks,
      summaryOfChanges: summaryOfChanges || (isEditing ? "Updated page content" : "Initial creation"),
      lastModifiedBy: "Dr. Alex Harrison",
    };

    try {
      const url = isEditing ? `/api/html-chunks/pages/${pageId}` : "/api/html-chunks/pages";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Error Saving Page", description: data.error || "Validation failed", variant: "destructive" });
        if (data.error && data.error.includes("Identifier URL")) {
          setUrlError(data.error);
        }
        return;
      }

      toast({
        title: isEditing ? "Page Updated" : "Page Created",
        description: `"${title}" saved as ${payload.status}.`,
      });

      setLocation("/html-chunk-pages");
    } catch (e) {
      toast({ title: "Error", description: "Network error saving page", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!pageId) return;

    try {
      const res = await fetch(`/api/html-chunks/pages/${pageId}/restore/${versionNumber}`, {
        method: "POST",
      });

      if (res.ok) {
        toast({ title: "Restored", description: `Restored version v${versionNumber}` });
        fetchPageDetails(pageId);
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to restore version", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading Page Builder...</div>;
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header Actions Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-sm sticky top-[72px] z-20">
        <div className="flex items-center gap-3">
          <Link href="/html-chunk-pages">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-gray-900">
                {isEditing ? `Edit: ${title || "Page"}` : "Create New HTML Chunk Page"}
              </h1>
              <Badge variant={status === "published" ? "default" : "outline"} className="capitalize">
                {status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              URL: https://hexpertify.com/{identifierUrl || "identifier-url"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Device Preview Button */}
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            className="rounded-xl text-xs gap-1.5 font-semibold"
          >
            <Eye className="w-4 h-4 text-primary" /> Preview Page
          </Button>

          {/* Version History Button */}
          {isEditing && (
            <Button
              variant="outline"
              onClick={() => setShowVersionHistory(true)}
              className="rounded-xl text-xs gap-1.5 font-semibold text-indigo-600 hover:bg-indigo-50 border-indigo-200"
            >
              <History className="w-4 h-4" /> Revisions
            </Button>
          )}

          {/* Save Draft */}
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => handleSave("draft")}
            className="rounded-xl text-xs gap-1.5 font-semibold"
          >
            <Save className="w-4 h-4" /> Save Draft
          </Button>

          {/* Publish */}
          <Button
            disabled={saving}
            onClick={() => handleSave("published")}
            className="rounded-xl text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Sparkles className="w-4 h-4" /> Publish Page
          </Button>
        </div>
      </div>

      {/* Main Form & Builder Workspace */}
      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList className="bg-white p-1 border border-border rounded-xl shadow-sm">
          <TabsTrigger value="builder" className="rounded-lg text-xs font-bold gap-2">
            <Layout className="w-4 h-4" /> Page Builder & Chunks
          </TabsTrigger>
          <TabsTrigger value="seo" className="rounded-lg text-xs font-bold gap-2">
            <Search className="w-4 h-4" /> SEO & Meta Settings
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Builder & Chunks */}
        <TabsContent value="builder" className="space-y-6">
          {/* Page Details Card */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-border pb-3">Basic Page Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                  Page Title <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Career Guidance"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                  <span>Identifier URL (Slug) <span className="text-destructive">*</span></span>
                  <span className="text-[10px] text-muted-foreground font-normal">Must be unique</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> /
                  </div>
                  <Input
                    placeholder="career-guidance"
                    value={identifierUrl}
                    onChange={(e) => handleIdentifierUrlChange(e.target.value)}
                    className={`pl-8 rounded-xl font-mono text-xs ${
                      urlError ? "border-destructive focus-visible:ring-destructive" : "border-border"
                    }`}
                  />
                </div>
                {urlError ? (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" /> {urlError}
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                    <Check className="w-3.5 h-3.5" /> URL valid: https://hexpertify.com/{identifierUrl || "..."}
                  </p>
                )}
              </div>
            </div>

            {isEditing && (
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                  Summary of Changes (recorded in version history)
                </label>
                <Input
                  placeholder="e.g. Updated hero banner copy and added FAQ section"
                  value={summaryOfChanges}
                  onChange={(e) => setSummaryOfChanges(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            )}
          </div>

          {/* SEO Metadata Card */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 border-b border-border pb-3">SEO Metadata</h3>
              <p className="text-xs text-muted-foreground mt-1">Configure search engine titles, descriptions, and indexing parameters.</p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    Meta Title <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">{seo.metaTitle?.length || 0}/60 characters</span>
                </div>
                <Input
                  placeholder="Page title for search engines (50-60 characters)"
                  value={seo.metaTitle}
                  onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    Meta Description <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">{seo.metaDescription?.length || 0}/160 characters</span>
                </div>
                <Textarea
                  rows={3}
                  placeholder="Page description for search engines (150-160 characters)"
                  value={seo.metaDescription}
                  onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Meta Keywords <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Enter a keyword and press Enter or click Add"
                  value={seo.metaKeywords}
                  onChange={(e) => setSeo({ ...seo, metaKeywords: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

            </div>
          </div>

          {/* Open Graph (Social Media) Card */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 border-b border-border pb-3">Open Graph (Social Media)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                These fields control how your page appears when shared on social media platforms like Facebook, Twitter, LinkedIn, etc.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    OG Title <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">{seo.ogTitle?.length || 0}/60 characters</span>
                </div>
                <Input
                  placeholder="Title for social media sharing (leave empty to use Meta Title)"
                  value={seo.ogTitle}
                  onChange={(e) => setSeo({ ...seo, ogTitle: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    OG Description <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">{seo.ogDescription?.length || 0}/200 characters</span>
                </div>
                <Textarea
                  rows={3}
                  placeholder="Description for social media sharing (leave empty to use Meta Description)"
                  value={seo.ogDescription}
                  onChange={(e) => setSeo({ ...seo, ogDescription: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  OG Image URL <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="https://example.com/og-image.jpg (1200x630px recommended)"
                  value={seo.ogImage}
                  onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })}
                  className="rounded-xl text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Recommended size: 1200x630 pixels for optimal display</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  OG Image Alt Text <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Description of OG image"
                  value={seo.ogAltText}
                  onChange={(e) => setSeo({ ...seo, ogAltText: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Structured Data Card */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 border-b border-border pb-3">Structured Data</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Add custom HTML/JSON-LD structured data for enhanced SEO (e.g., schema.org markup)
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">HTML Chunk / JSON-LD (Optional)</label>
              <Textarea
                rows={5}
                placeholder='<script type="application/ld+json"> ... </script>'
                value={seo.structuredData || ""}
                onChange={(e) => setSeo({ ...seo, structuredData: e.target.value })}
                className="font-mono text-xs rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground mt-1">You can add JSON-LD, microdata, or any other structured data markup here</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900 text-xs shadow-sm">
            <div className="p-2 bg-amber-500/20 text-amber-700 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold">Global Header & Footer Locked:</span> Every page automatically inherits the central site Header and Footer. Only the dynamic middle content is built using reusable HTML Chunks below.
            </div>
          </div>

          {/* Preset Library Palette */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Preset HTML Chunk Library</h3>
                <p className="text-xs text-muted-foreground">Click any component to append it to your page layout.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {PRESET_CHUNKS.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => addChunkFromPreset(preset)}
                  className="p-3 border border-border hover:border-primary rounded-xl bg-secondary/20 hover:bg-primary/5 text-left transition-all group flex flex-col justify-between"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{preset.icon}</div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 group-hover:text-primary">{preset.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Plus className="w-3 h-3 text-primary" /> Add Chunk
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Canvas of Chunks */}
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-gray-900 flex items-center justify-between">
              <span>Page Layout Chunks ({chunks.length})</span>
              <span className="text-xs text-muted-foreground font-normal">Use arrows to rearrange chunk order</span>
            </h3>

            {chunks.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-border p-12 rounded-2xl text-center text-muted-foreground">
                <Code className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                <h4 className="font-bold text-gray-900">No Chunks Added Yet</h4>
                <p className="text-xs mt-1">Select components from the Preset Library above to construct your page content.</p>
              </div>
            ) : (
              chunks.map((chunk, index) => (
                <div key={chunk.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden group">
                  {/* Chunk Header bar */}
                  <div className="bg-slate-50 border-b border-border px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center font-mono">
                        {index + 1}
                      </span>
                      <Input
                        value={chunk.name}
                        onChange={(e) =>
                          setChunks(chunks.map((c) => (c.id === chunk.id ? { ...c, name: e.target.value } : c)))
                        }
                        className="h-7 text-xs font-bold w-48 bg-white"
                      />
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {chunk.type}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => moveChunk(index, "up")}
                        title="Move Up"
                        className="h-7 w-7 text-slate-600 hover:bg-slate-200"
                      >
                        <MoveUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={index === chunks.length - 1}
                        onClick={() => moveChunk(index, "down")}
                        title="Move Down"
                        className="h-7 w-7 text-slate-600 hover:bg-slate-200"
                      >
                        <MoveDown className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeChunk(chunk.id)}
                        title="Remove Chunk"
                        className="h-7 w-7 text-slate-400 hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* HTML Code Editor */}
                  <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        HTML Code Content
                      </label>
                      <Textarea
                        rows={8}
                        value={chunk.content}
                        onChange={(e) => updateChunkContent(chunk.id, e.target.value)}
                        className="font-mono text-xs bg-slate-950 text-slate-100 rounded-xl leading-relaxed p-3"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Live Visual Render
                      </label>
                      <div className="border rounded-xl p-3 bg-slate-50 min-h-[170px] overflow-hidden text-xs">
                        <div dangerouslySetInnerHTML={{ __html: chunk.content }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* TAB 2: SEO Settings */}
        <TabsContent value="seo" className="space-y-6">
          {/* Basic Page Information Card */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-border pb-3">Basic Page Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                  Page Title <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Career Guidance"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                  <span>Identifier URL (Slug) <span className="text-destructive">*</span></span>
                  <span className="text-[10px] text-muted-foreground font-normal">Must be unique</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" /> /
                  </div>
                  <Input
                    placeholder="career-guidance"
                    value={identifierUrl}
                    onChange={(e) => handleIdentifierUrlChange(e.target.value)}
                    className={`pl-8 rounded-xl font-mono text-xs ${
                      urlError ? "border-destructive focus-visible:ring-destructive" : "border-border"
                    }`}
                  />
                </div>
                {urlError ? (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" /> {urlError}
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                    <Check className="w-3.5 h-3.5" /> URL valid: https://hexpertify.com/{identifierUrl || "..."}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SEO Metadata Card */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">SEO Metadata</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Optimize for search engines</p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    Meta Title <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">{seo.metaTitle?.length || 0}/60 characters</span>
                </div>
                <Input
                  placeholder="Page title for search engines (50-60 characters)"
                  value={seo.metaTitle}
                  onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    Meta Description <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">{seo.metaDescription?.length || 0}/160 characters</span>
                </div>
                <Textarea
                  rows={3}
                  placeholder="Page description for search engines (150-160 characters)"
                  value={seo.metaDescription}
                  onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Meta Keywords <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Enter a keyword and press Enter or click Add"
                  value={seo.metaKeywords}
                  onChange={(e) => setSeo({ ...seo, metaKeywords: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

            </div>
          </div>

          {/* Open Graph (Social Media) Card */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Open Graph (Social Media)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                These fields control how your page appears when shared on social media platforms like Facebook, Twitter, LinkedIn, etc.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    OG Title <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">{seo.ogTitle?.length || 0}/60 characters</span>
                </div>
                <Input
                  placeholder="Title for social media sharing (leave empty to use Meta Title)"
                  value={seo.ogTitle}
                  onChange={(e) => setSeo({ ...seo, ogTitle: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 block">
                    OG Description <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">{seo.ogDescription?.length || 0}/200 characters</span>
                </div>
                <Textarea
                  rows={3}
                  placeholder="Description for social media sharing (leave empty to use Meta Description)"
                  value={seo.ogDescription}
                  onChange={(e) => setSeo({ ...seo, ogDescription: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  OG Image URL <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="https://example.com/og-image.jpg (1200x630px recommended)"
                  value={seo.ogImage}
                  onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })}
                  className="rounded-xl text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Recommended size: 1200x630 pixels for optimal display</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  OG Image Alt Text <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Description of OG image"
                  value={seo.ogAltText}
                  onChange={(e) => setSeo({ ...seo, ogAltText: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Structured Data Card */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Structured Data</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add custom HTML/JSON-LD structured data for enhanced SEO (e.g., schema.org markup)
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">HTML Chunk / JSON-LD (Optional)</label>
              <Textarea
                rows={5}
                placeholder='<script type="application/ld+json"> ... </script>'
                value={seo.structuredData || ""}
                onChange={(e) => setSeo({ ...seo, structuredData: e.target.value })}
                className="font-mono text-xs rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground mt-1">You can add JSON-LD, microdata, or any other structured data markup here</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {showPreview && (
        <HtmlChunkPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          pageTitle={title}
          identifierUrl={identifierUrl}
          chunks={chunks}
        />
      )}

      {/* Version History Modal */}
      {showVersionHistory && pageId && (
        <HtmlChunkVersionModal
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          pageId={pageId}
          onRestore={handleRestoreVersion}
        />
      )}
    </div>
  );
}
