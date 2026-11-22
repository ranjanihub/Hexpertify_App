import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  FileCode,
  Plus,
  Search,
  Eye,
  Edit,
  History,
  Trash2,
  ExternalLink,
  Globe,
  Archive,
  CheckCircle,
  FileText,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HtmlChunkPreviewModal } from "@/components/html-chunk-preview";
import { HtmlChunkVersionModal } from "@/components/html-chunk-version-modal";
import { useToast } from "@/hooks/use-toast";

interface HtmlPage {
  id: number;
  title: string;
  identifierUrl: string;
  status: "draft" | "published" | "archived";
  seoDetails: any;
  chunks: any[];
  createdBy: string;
  lastModifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function HtmlChunkPages() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [pages, setPages] = useState<HtmlPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [previewPage, setPreviewPage] = useState<HtmlPage | null>(null);
  const [versionPageId, setVersionPageId] = useState<number | null>(null);

  useEffect(() => {
    fetchPages();
  }, [search, statusFilter]);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append("search", search);
      if (statusFilter && statusFilter !== "all") query.append("status", statusFilter);

      const res = await fetch(`/api/html-chunks/pages?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } catch (e) {
      console.error("Error fetching pages", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/html-chunks/pages/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Page deleted", description: `Deleted "${title}" successfully.` });
        fetchPages();
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete page", variant: "destructive" });
    }
  };

  const handleStatusChange = async (page: HtmlPage, newStatus: string) => {
    try {
      const res = await fetch(`/api/html-chunks/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...page,
          status: newStatus,
          summaryOfChanges: `Changed status to ${newStatus}`,
        }),
      });

      if (res.ok) {
        toast({ title: "Status Updated", description: `Page "${page.title}" is now ${newStatus}.` });
        fetchPages();
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!versionPageId) return;

    try {
      const res = await fetch(`/api/html-chunks/pages/${versionPageId}/restore/${versionNumber}`, {
        method: "POST",
      });

      if (res.ok) {
        toast({
          title: "Version Restored",
          description: `Successfully restored version v${versionNumber}`,
        });
        fetchPages();
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to restore version", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-semibold gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> Published
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 font-semibold gap-1">
            <FileText className="w-3 h-3 text-amber-600" /> Draft
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-300 font-semibold gap-1">
            <Archive className="w-3 h-3 text-slate-500" /> Archived
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">HTML Chunk Pages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, publish, and manage custom chunk-based landing pages with identifier URLs & SEO controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/html-chunk-pages/new">
            <Button className="rounded-xl shadow-md gap-2 font-semibold bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Create New Page
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search title or identifier URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-lg text-sm bg-secondary/30"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground ml-2 hidden sm:block" />
          <span className="text-xs font-semibold text-muted-foreground hidden sm:block">Status:</span>

          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border w-full sm:w-auto">
            {["all", "draft", "published", "archived"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                  statusFilter === st
                    ? "bg-white text-gray-900 shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Loading custom pages...</div>
        ) : pages.length === 0 ? (
          <div className="py-20 text-center">
            <FileCode className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-bold text-gray-900">No HTML Chunk Pages Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
              Get started by creating your first custom page built with modular HTML chunks.
            </p>
            <Link href="/html-chunk-pages/new">
              <Button size="sm" className="rounded-lg gap-2">
                <Plus className="w-4 h-4" /> Create New Page
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-border text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Page Title</th>
                  <th className="py-4 px-4">Identifier URL</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Author / Modifier</th>
                  <th className="py-4 px-4">Updated Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:scale-105 transition-transform">
                          <FileCode className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{page.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {page.chunks?.length || 0} HTML Chunks configured
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>/{page.identifierUrl}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">{getStatusBadge(page.status)}</td>

                    <td className="py-4 px-4 text-xs text-muted-foreground">
                      <div className="font-medium text-gray-800">{page.lastModifiedBy || page.createdBy}</div>
                      <div className="text-[10px]">Created by {page.createdBy}</div>
                    </td>

                    <td className="py-4 px-4 text-xs text-muted-foreground">
                      {new Date(page.updatedAt || page.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Preview Button */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPreviewPage(page)}
                          title="Preview Page"
                          className="h-8 w-8 text-slate-600 hover:text-primary hover:bg-primary/10 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {/* Edit Button */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setLocation(`/html-chunk-pages/${page.id}/edit`)}
                          title="Edit Page"
                          className="h-8 w-8 text-slate-600 hover:text-primary hover:bg-primary/10 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        {/* Version History Button */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setVersionPageId(page.id)}
                          title="Version History"
                          className="h-8 w-8 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        >
                          <History className="w-4 h-4" />
                        </Button>

                        {/* Quick View Link if Published */}
                        {page.status === "published" && (
                          <Link href={`/p/${page.identifierUrl}`} target="_blank">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Open Published URL"
                              className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        )}

                        {/* Status Toggle Dropdown / Buttons */}
                        {page.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(page, "published")}
                            className="h-7 text-xs px-2 text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                          >
                            Publish
                          </Button>
                        )}
                        {page.status === "published" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(page, "draft")}
                            className="h-7 text-xs px-2 text-amber-700 hover:bg-amber-50 border-amber-300"
                          >
                            Unpublish
                          </Button>
                        )}

                        {/* Delete */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(page.id, page.title)}
                          title="Delete Page"
                          className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewPage && (
        <HtmlChunkPreviewModal
          isOpen={!!previewPage}
          onClose={() => setPreviewPage(null)}
          pageTitle={previewPage.title}
          identifierUrl={previewPage.identifierUrl}
          chunks={previewPage.chunks || []}
        />
      )}

      {/* Version History Modal */}
      {versionPageId && (
        <HtmlChunkVersionModal
          isOpen={!!versionPageId}
          onClose={() => setVersionPageId(null)}
          pageId={versionPageId}
          onRestore={handleRestoreVersion}
        />
      )}
    </div>
  );
}
