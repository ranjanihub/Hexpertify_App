import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useSubmitBlogPost, useSubmitBlogOutline } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PenTool,
  FileText,
  Send,
  Upload,
  X,
  Clock,
  Trash2,
  Tag,
  Plus,
  ArrowLeft,
  Eye,
  Search,
  CheckCircle2,
  BookOpen,
  Sparkles,
  User,
  Calendar,
  Filter,
  Info,
  Image as ImageIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

/* ── schemas ──────────────────────────────────────────────── */
const postSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100),
  category: z.string().min(1, "Please select a category."),
  tags: z.string().optional(),
  content: z.string().min(1, "Content is required."),
  featuredImage: z.string().optional().nullable().or(z.literal("")),
});

const outlineSchema = z.object({
  proposedTitle: z.string().min(5, "Title must be at least 5 characters."),
  keyPoints: z.string().min(1, "Please list at least one key point."),
  targetAudience: z.string().min(1, "Please describe the audience."),
  keywords: z.string().min(1, "Please provide keywords."),
  notes: z.string().optional(),
});

/* ── types ────────────────────────────────────────────────── */
interface BlogPostItem {
  id: number | string;
  title: string;
  category: string;
  tags?: string[];
  content: string;
  featuredImage?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  isPdf?: boolean;
  status: "published" | "submitted" | "draft" | string;
  author?: string;
  createdAt: string;
}

interface PostDraft {
  id: string;
  kind: "post";
  title: string;
  category: string;
  tags?: string;
  content: string;
  savedAt: Date;
}

interface OutlineDraft {
  id: string;
  kind: "outline";
  proposedTitle: string;
  keyPoints: string;
  targetAudience: string;
  keywords: string;
  notes?: string;
  savedAt: Date;
}

type Draft = PostDraft | OutlineDraft;

/** The signed-in therapist as the post/outline author, with their Consultant id */
async function getAuthorIdentity() {
  const user = getAuthUser();
  const email = String(user?.email || "").toLowerCase().trim();
  let consultantId = String(user?.id || "");
  if (email) {
    try {
      const res = await fetch("/api/consultants");
      const data = res.ok ? await res.json() : null;
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.consultants) ? data.consultants : Array.isArray(data?.data) ? data.data : [];
      const match = list.find((c) => String(c.email || "").toLowerCase() === email);
      if (match) consultantId = String(match.id || match._id);
    } catch {}
  }
  return {
    author: user?.name || "",
    authorEmail: email,
    authorRole: user?.title || user?.profession || "",
    authorAvatar: user?.photoUrl || user?.avatarUrl || user?.image || "",
    consultantId,
  };
}

function timeAgo(dateString: string | Date) {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (isNaN(secs)) return "recently";
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ── PDF Utilities ──────────────────────────────────────────
export function getPdfBlobUrl(urlOrDataUrl?: string | null): string {
  if (!urlOrDataUrl) return "";
  if (!urlOrDataUrl.startsWith("data:")) return urlOrDataUrl;
  try {
    const parts = urlOrDataUrl.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
    const base64Data = parts[1] || "";
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteNumbers], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error("Failed to convert Data URL to Blob URL:", err);
    return urlOrDataUrl;
  }
}

export function openPdfWindow(urlOrDataUrl?: string | null) {
  if (!urlOrDataUrl) return;
  const blobUrl = getPdfBlobUrl(urlOrDataUrl);
  if (blobUrl) {
    const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
    if (win) win.focus();
  }
}

export function downloadPdfFile(urlOrDataUrl?: string | null, fileName: string = "Document.pdf") {
  if (!urlOrDataUrl) return;
  const blobUrl = getPdfBlobUrl(urlOrDataUrl);
  if (!blobUrl) return;
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ── tab pill ─────────────────────────────────────────────── */
function Tab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold border transition-all cursor-pointer",
        active
          ? "bg-primary text-white border-primary shadow-sm"
          : "bg-white text-muted-foreground border-border hover:border-primary/30 hover:text-primary"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

/* ── Drafts panel ─────────────────────────────────────────── */
function DraftsPanel({
  drafts,
  onDelete,
  onRestore,
}: {
  drafts: Draft[];
  onDelete: (id: string) => void;
  onRestore: (draft: Draft) => void;
}) {
  if (!Array.isArray(drafts) || drafts.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Saved Drafts ({drafts.length})
      </p>
      <div className="space-y-2">
        {drafts.map((draft) => {
          const title = draft.kind === "post" ? draft.title : draft.proposedTitle;
          const sub =
            draft.kind === "post"
              ? draft.category || "No category"
              : draft.keywords || "No keywords";
          return (
            <div
              key={draft.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-white hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {draft.kind === "post" ? (
                  <PenTool className="w-4 h-4 text-primary" />
                ) : (
                  <FileText className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{title || "Untitled draft"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">{sub}</span>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{timeAgo(draft.savedAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-3 text-xs text-primary hover:bg-primary/10"
                  onClick={() => onRestore(draft)}
                >
                  Edit
                </Button>
                <button
                  onClick={() => onDelete(draft.id)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Full blog form ───────────────────────────────────────── */
function FullBlogForm({
  onSaveDraft,
  onSuccessSubmit,
  defaultValues,
}: {
  onSaveDraft: (values: z.infer<typeof postSchema>) => void;
  onSuccessSubmit: () => void;
  defaultValues?: Partial<z.infer<typeof postSchema>>;
}) {
  const { toast } = useToast();
  const submitPost = useSubmitBlogPost();

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      category: "",
      tags: "",
      content: "",
      featuredImage: "",
      ...defaultValues,
    },
  });

  async function onSubmit(values: z.infer<typeof postSchema>) {
    const identity = await getAuthorIdentity();

    submitPost.mutate(
      {
        data: {
          title: values.title,
          category: values.category,
          tags: values.tags ? values.tags.split(",").map((t) => t.trim()) : [],
          content: values.content,
          featuredImage: values.featuredImage || null,
          ...identity,
        } as any,
      },
      {
        onSuccess: () => {
          toast({
            title: "Blog post submitted successfully!",
            description: "Your post is now listed in your submitted blogs.",
          });
          form.reset();
          onSuccessSubmit();
        },
        onError: () =>
          toast({
            title: "Error",
            description: "Failed to submit post.",
            variant: "destructive",
          }),
      }
    );
  }

  function handleSaveDraft() {
    const values = form.getValues();
    onSaveDraft(values);
    toast({ title: "Draft saved", description: "You can find it in the drafts list." });
  }

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="bg-secondary/30 pb-4 border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <PenTool className="w-5 h-5 text-primary" /> Post Editor
        </CardTitle>
        <CardDescription>
          Articles should be evidence-based and written for a general audience.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Article Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g., Understanding the Mechanics of CBT"
                      className="text-base font-medium"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Anxiety">Anxiety & Stress</SelectItem>
                        <SelectItem value="Depression">Depression</SelectItem>
                        <SelectItem value="Relationships">Relationships</SelectItem>
                        <SelectItem value="Mindfulness">Mindfulness</SelectItem>
                        <SelectItem value="Therapy_Guide">Therapy Guide</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tags{" "}
                      <span className="text-muted-foreground font-normal">
                        (comma separated)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="cbt, anxiety, coping" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Featured / Cover Image Section */}
            <FormField
              control={form.control}
              name="featuredImage"
              render={({ field }) => (
                <FormItem className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-1.5 font-bold text-sm text-slate-800">
                      <ImageIcon className="w-4 h-4 text-primary" />
                      Article Cover Image <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                    </FormLabel>
                    {field.value ? (
                      <button
                        type="button"
                        onClick={() => field.onChange("")}
                        className="text-xs text-destructive hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" /> Remove Cover Image
                      </button>
                    ) : null}
                  </div>

                  {/* If Cover Image is selected -> Live Banner Preview */}
                  {field.value ? (
                    <div className="relative rounded-2xl overflow-hidden border border-border shadow-sm group">
                      <img
                        src={field.value}
                        alt="Cover Preview"
                        className="w-full h-44 sm:h-52 object-cover bg-slate-100"
                        onError={() => {
                          toast({ title: "Image Error", description: "Failed to load image from URL", variant: "destructive" });
                        }}
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <label className="px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-lg hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-primary" /> Change Image
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  field.onChange(ev.target?.result as string);
                                };
                                reader.readAsDataURL(f);
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => field.onChange("")}
                          className="px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-lg hover:bg-rose-700 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Image Upload Box + Direct URL input + Quick Presets */
                    <div className="p-4 rounded-2xl border border-dashed border-border bg-secondary/20 space-y-3">
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        {/* File Upload Button */}
                        <label className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-primary/5 text-primary border border-primary/30 hover:border-primary text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0">
                          <Upload className="w-4 h-4" />
                          <span>Upload Image File</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  field.onChange(ev.target?.result as string);
                                };
                                reader.readAsDataURL(f);
                              }
                            }}
                          />
                        </label>

                        <span className="text-xs text-muted-foreground font-medium">or link:</span>

                        {/* Direct URL input */}
                        <FormControl className="flex-1 w-full">
                          <Input
                            placeholder="Paste image link (https://...)"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="bg-white text-xs"
                          />
                        </FormControl>
                      </div>

                      {/* Curated Aesthetic Presets */}
                      <div className="pt-2 border-t border-border/60">
                        <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-primary" /> Quick cover presets:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            {
                              label: "Mindfulness & Zen",
                              url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80",
                            },
                            {
                              label: "Brain Science",
                              url: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&auto=format&fit=crop&q=80",
                            },
                            {
                              label: "Therapy",
                              url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80",
                            },
                            {
                              label: "Calm Nature",
                              url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80",
                            },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => field.onChange(preset.url)}
                              className="group/preset relative h-14 rounded-xl overflow-hidden border border-border/80 hover:border-primary hover:shadow-md transition-all text-left cursor-pointer"
                            >
                              <img
                                src={preset.url}
                                alt={preset.label}
                                className="w-full h-full object-cover group-hover/preset:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-slate-950/40 group-hover/preset:bg-slate-950/20 transition-colors flex items-end p-1.5">
                                <span className="text-[10px] font-bold text-white leading-tight drop-shadow-sm">
                                  {preset.label}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Article Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your article content here..."
                      className="min-h-[280px] resize-y text-sm font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={handleSaveDraft}>
                Save Draft
              </Button>
              <Button
                type="submit"
                className="bg-primary text-white font-bold"
                disabled={submitPost.isPending}
              >
                {submitPost.isPending ? (
                  "Submitting…"
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit for Review
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ── Outline form ─────────────────────────────────────────── */
function OutlineForm({
  onSaveDraft,
  onSuccessSubmit,
  defaultValues,
}: {
  onSaveDraft: (values: z.infer<typeof outlineSchema>) => void;
  onSuccessSubmit: () => void;
  defaultValues?: Partial<z.infer<typeof outlineSchema>>;
}) {
  const { toast } = useToast();
  const submitOutline = useSubmitBlogOutline();

  const form = useForm<z.infer<typeof outlineSchema>>({
    resolver: zodResolver(outlineSchema),
    defaultValues: {
      proposedTitle: "",
      keyPoints: "",
      targetAudience: "",
      keywords: "",
      notes: "",
      ...defaultValues,
    },
  });

  async function onSubmit(values: z.infer<typeof outlineSchema>) {
    const identity = await getAuthorIdentity();
    const finalKeyPoints = values.keyPoints.split("\n").filter((p) => p.trim());
    const finalNotes = values.notes || "";

    submitOutline.mutate(
      {
        data: {
          proposedTitle: values.proposedTitle,
          keyPoints: finalKeyPoints,
          targetAudience: values.targetAudience,
          keywords: values.keywords.split(",").map((k) => k.trim()),
          notes: finalNotes || null,
          ...identity,
        } as any,
      },
      {
        onSuccess: () => {
          toast({
            title: "Outline submitted successfully!",
            description: "Our editorial team will review your outline shortly.",
          });
          form.reset();
          onSuccessSubmit();
        },
        onError: () =>
          toast({
            title: "Error",
            description: "Failed to submit outline.",
            variant: "destructive",
          }),
      }
    );
  }

  function handleSaveDraft() {
    const values = form.getValues();
    onSaveDraft(values);
    toast({ title: "Draft saved", description: "You can find it in the drafts list." });
  }

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="bg-secondary/30 pb-4 border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Article Proposal
        </CardTitle>
        <CardDescription>
          Submitting an outline ensures your topic aligns with our current content needs.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="proposedTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposed Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g., 5 Signs of Burnout You Might Be Ignoring"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="keyPoints"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Points to Cover</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={"Point 1…\nPoint 2…\nPoint 3…"}
                      className="min-h-[120px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Put each point on a new line.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="E.g., Young professionals, Parents"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Keywords{" "}
                      <span className="text-muted-foreground font-normal">
                        (comma separated)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="burnout, stress, work-life" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Additional Notes{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any specific research or reference details you plan to cite?"
                      className="min-h-[80px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={handleSaveDraft}>
                Save Draft
              </Button>
              <Button
                type="submit"
                className="bg-primary text-white font-bold"
                disabled={submitOutline.isPending}
              >
                {submitOutline.isPending ? (
                  "Submitting…"
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Outline
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ── Main Page Component ───────────────────────────────────── */
export default function Blog() {
  const { toast } = useToast();
  // Navigation view: "list" (default list of all submitted blogs) vs "submit" (submit blog form)
  const [view, setView] = useState<"list" | "submit">("list");
  const [tab, setTab] = useState<"post" | "outline">("post");

  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [previewPost, setPreviewPost] = useState<BlogPostItem | null>(null);
  const [activeBlobUrl, setActiveBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (previewPost?.fileUrl) {
      const bUrl = getPdfBlobUrl(previewPost.fileUrl);
      setActiveBlobUrl(bUrl);
      cleanup = () => {
        if (bUrl && bUrl.startsWith("blob:")) {
          URL.revokeObjectURL(bUrl);
        }
      };
    } else {
      setActiveBlobUrl(null);
    }
    return cleanup;
  }, [previewPost?.fileUrl]);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [restoreValues, setRestoreValues] = useState<
    Partial<z.infer<typeof postSchema>> | Partial<z.infer<typeof outlineSchema>> | undefined
  >(undefined);
  const [restoreKey, setRestoreKey] = useState(0);

  const postDrafts = drafts.filter((d) => d.kind === "post") as PostDraft[];
  const outlineDrafts = drafts.filter((d) => d.kind === "outline") as OutlineDraft[];
  const visibleDrafts = tab === "post" ? postDrafts : outlineDrafts;

  useEffect(() => {
    fetchSubmittedBlogs();
  }, []);

  const fetchSubmittedBlogs = async () => {
    setLoading(true);
    try {
      const myEmail = String(getAuthUser()?.email || "").toLowerCase().trim();
      if (!myEmail) {
        setPosts([]);
        return;
      }
      const res = await fetch(`/api/blog/posts?authorEmail=${encodeURIComponent(myEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : (data?.posts || []));
      } else {
        setPosts([]);
      }
    } catch (e) {
      console.error("Error fetching blog posts from DB", e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/blog/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Post deleted", description: `Deleted "${title}" successfully.` });
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
    }
  };

  function savePostDraft(values: z.infer<typeof postSchema>) {
    setDrafts((prev) => [
      { id: crypto.randomUUID(), kind: "post", savedAt: new Date(), ...values },
      ...prev,
    ]);
  }

  function saveOutlineDraft(values: z.infer<typeof outlineSchema>) {
    setDrafts((prev) => [
      { id: crypto.randomUUID(), kind: "outline", savedAt: new Date(), ...values },
      ...prev,
    ]);
  }

  function deleteDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  function restoreDraft(draft: Draft) {
    if (draft.kind === "post") {
      const { id, kind, savedAt, ...values } = draft;
      setTab("post");
      setRestoreValues(values);
    } else {
      const { id, kind, savedAt, ...values } = draft;
      setTab("outline");
      setRestoreValues(values);
    }
    setView("submit");
    setRestoreKey((k) => k + 1);
    deleteDraft(draft.id);
  }

  const handleFormSuccess = () => {
    fetchSubmittedBlogs();
    setView("list");
  };

  // Filtered posts for list view
  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && (p.status === "published" || p.status === "approved")) ||
      (statusFilter === "submitted" && (p.status === "submitted" || p.status === "pending")) ||
      (statusFilter === "draft" && p.status === "draft");

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "published":
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
          </Badge>
        );
      case "submitted":
      case "pending":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 flex items-center gap-1 font-bold">
            <Clock className="w-3 h-3 text-purple-600" /> Pending Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100 flex items-center gap-1 font-bold">
            <X className="w-3 h-3 text-rose-600" /> Rejected / Needs Revision
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-300">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title={view === "list" ? "Submitted Blogs & Articles" : "Submit New Blog Post"}
        description="Submit psychoeducational content, mental health articles, and updates for admin review."
        badge="CONTENT MANAGEMENT"
        icon={<PenTool className="w-4 h-4 text-purple-200" />}
      >
        <div className="flex items-center gap-3">
          {view === "list" ? (
            <button
              type="button"
              onClick={() => setView("submit")}
              className="inline-flex items-center justify-center gap-2 bg-white text-[#450bc8] hover:bg-white/90 font-extrabold text-xs px-4 py-2.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Submit Blog</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setView("list")}
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2.5 rounded-full border border-white/20 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Submitted Blogs</span>
            </button>
          )}
        </div>
      </PageHeader>

      {/* VIEW 1: LANDING VIEW - SUBMITTED BLOGS LIST */}
      {view === "list" && (
        <div className="space-y-6">
          {/* Filter and Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search blog title or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-lg text-sm bg-secondary/30"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground ml-2 hidden sm:block" />
              <span className="text-xs font-semibold text-muted-foreground hidden sm:block">
                Status:
              </span>

              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border w-full sm:w-auto">
                {["all", "published", "submitted"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all cursor-pointer ${
                      statusFilter === st
                        ? "bg-white text-gray-900 shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st === "submitted" ? "Pending" : st === "published" ? "Approved" : "All"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Drafts Banner if any exist */}
          <DraftsPanel
            drafts={drafts}
            onDelete={deleteDraft}
            onRestore={restoreDraft}
          />

          {/* Submitted Blogs Grid / List */}
          {loading ? (
            <div className="py-20 text-center text-muted-foreground bg-white rounded-2xl border border-border">
              Loading submitted blogs...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-border p-8">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-lg font-bold text-gray-900">No Submitted Blogs Found</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
                You haven't submitted any blogs matching your search criteria. Click below to submit your first article.
              </p>
              <Button
                onClick={() => setView("submit")}
                className="rounded-xl shadow-md gap-2 font-bold bg-primary hover:bg-primary/90 text-white cursor-pointer px-6 py-2.5"
              >
                <Plus className="w-5 h-5" /> Submit Blog Now
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post) => {
                const formattedDate = new Date(post.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <div
                    key={post.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all duration-150"
                  >
                    {/* Title & Submission Date */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 text-base leading-snug">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>Submitted on {formattedDate !== "Invalid Date" ? formattedDate : post.createdAt}</span>
                      </div>
                    </div>

                    {/* Status & Preview Button */}
                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                      <div>{getStatusBadge(post.status)}</div>
                      <Button
                        size="sm"
                        onClick={() => setPreviewPost(post)}
                        className="rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-white cursor-pointer px-4 py-2"
                      >
                        <Eye className="w-4 h-4" /> Preview
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SUBMIT BLOG FORM (Shown when user clicks "Submit Blog") */}
      {view === "submit" && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Tabs for Post vs Outline */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <Tab
                active={tab === "post"}
                onClick={() => setTab("post")}
                icon={PenTool}
                label="Full Blog Post"
              />
              <Tab
                active={tab === "outline"}
                onClick={() => setTab("outline")}
                icon={FileText}
                label="Blog Outline Proposal"
              />
            </div>
          </div>

          {/* Drafts for current tab */}
          <DraftsPanel
            drafts={visibleDrafts}
            onDelete={deleteDraft}
            onRestore={restoreDraft}
          />

          {/* Form Content */}
          {tab === "post" ? (
            <FullBlogForm
              key={`post-${restoreKey}`}
              onSaveDraft={savePostDraft}
              onSuccessSubmit={handleFormSuccess}
              defaultValues={
                tab === "post"
                  ? (restoreValues as Partial<z.infer<typeof postSchema>>)
                  : undefined
              }
            />
          ) : (
            <OutlineForm
              key={`outline-${restoreKey}`}
              onSaveDraft={saveOutlineDraft}
              onSuccessSubmit={handleFormSuccess}
              defaultValues={
                tab === "outline"
                  ? (restoreValues as Partial<z.infer<typeof outlineSchema>>)
                  : undefined
              }
            />
          )}
        </div>
      )}

      {/* PREVIEW MODAL */}
      <Dialog open={!!previewPost} onOpenChange={(open) => !open && setPreviewPost(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl p-4 sm:p-8 rounded-2xl bg-white max-h-[92vh] overflow-y-auto">
          {previewPost && (
            <div className="space-y-6">
              {previewPost.featuredImage && (
                <div className="h-56 w-full rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={previewPost.featuredImage}
                    alt={previewPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-primary/10 text-primary font-bold">
                    {previewPost.category}
                  </Badge>
                  {getStatusBadge(previewPost.status)}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {timeAgo(previewPost.createdAt)}
                  </span>
                </div>

                <DialogTitle className="text-2xl font-extrabold text-gray-900 leading-tight">
                  {previewPost.title}
                </DialogTitle>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 border-b border-border pb-4">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>Submitted by {previewPost.author || "Dr. Alex Harrison"}</span>
                </div>
              </div>

              {(() => {
                const isPdf = Boolean(
                  previewPost.isPdf ||
                  previewPost.fileType === 'application/pdf' ||
                  previewPost.fileName?.toLowerCase().endsWith('.pdf') ||
                  previewPost.content?.toLowerCase().endsWith('.pdf') ||
                  previewPost.fileUrl?.startsWith('data:application/pdf')
                );
                const pdfName = previewPost.fileName || (previewPost.content?.endsWith('.pdf') ? previewPost.content : 'Document.pdf');

                if (isPdf) {
                  return (
                    <div className="space-y-4">
                      {/* PDF Header Card */}
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-200 text-rose-800 uppercase tracking-wider">
                                PDF Document
                              </span>
                              {previewPost.fileSize && (
                                <span className="text-xs text-rose-700 font-medium">
                                  {(previewPost.fileSize / 1024).toFixed(1)} KB
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
                              {pdfName}
                            </p>
                          </div>
                        </div>

                        {previewPost.fileUrl && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => openPdfWindow(previewPost.fileUrl!)}
                              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              Open in New Tab
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadPdfFile(previewPost.fileUrl!, pdfName)}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              Download PDF
                            </button>
                          </div>
                        )}
                      </div>

                      {/* PDF Interactive Frame if fileUrl exists */}
                      {activeBlobUrl ? (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                          <object
                            data={`${activeBlobUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                            type="application/pdf"
                            className="w-full h-[400px] sm:h-[480px] border-none"
                          >
                            <iframe
                              src={`${activeBlobUrl}#toolbar=1`}
                              className="w-full h-[400px] sm:h-[480px] border-none"
                              title={pdfName}
                            />
                          </object>
                        </div>
                      ) : (
                        <div className="p-6 rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 text-center space-y-1">
                          <p className="text-xs font-bold text-rose-800">
                            Attached Document: {pdfName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            (Document metadata attached. Open in viewer or submit a new version with preview.)
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-line text-gray-700 bg-slate-50/60 p-5 rounded-xl border border-slate-100">
                    {previewPost.content}
                  </div>
                );
              })()}

              {previewPost.tags && previewPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <span className="text-xs font-semibold text-muted-foreground">Tags:</span>
                  {previewPost.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-secondary text-primary font-medium px-2.5 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={() => setPreviewPost(null)} variant="outline" className="rounded-xl">
                  Close Preview
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
