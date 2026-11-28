import { useState, useEffect } from "react";
import { FolderOpen, Search, Plus, ExternalLink, Download, FileText, Headphones, Video, BookOpen, Clock, Tag, Globe, Lock, Bookmark, Star, ArrowRight, Info, Upload, Link as LinkIcon, FileUp, ChevronDown, Check, X, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getAuthUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export interface ResourceItem {
  id: string;
  type: "article" | "worksheet" | "meditation" | "video" | "pdf";
  typeLabel: string;
  category: string;
  isRecommended?: boolean;
  isPublic?: boolean;
  title: string;
  description: string;
  fullContent?: string;
  duration: string;
  imageUrl: string;
  downloadUrl?: string;
  tags: string[];
  /** Clients this resource is shared with; empty = visible to every client */
  sharedWith?: { clientId: string; clientEmail: string }[];
}

const CATEGORIES = ["All Resources", "Saved", "Articles", "Videos", "Worksheets", "Meditations", "PDFs"];

/** A link a client can open: a full http(s) web address with a real host (not just "https://") */
function isValidWebUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.hostname === "localhost" || /^[^.\s]+(\.[^.\s]+)+$/.test(url.hostname);
  } catch {
    return false;
  }
}

export default function Resources() {
  const authUser = getAuthUser();
  const { toast } = useToast();
  const myEmail = String(authUser?.email || "").toLowerCase().trim();
  const [resources, setResources] = useState<ResourceItem[]>([]);

  // The therapist's own clients, by id (the server matches them), for sharing
  const [contextOptions, setContextOptions] = useState<{ id: string; name: string; email: string; type: string }[]>([]);
  useEffect(() => {
    const myId = String(authUser?.id || "");
    if (!myId) return;
    fetch(`/api/users?therapistId=${encodeURIComponent(myId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((usersRes) => {
        if (!Array.isArray(usersRes?.users)) return;
        const mine = usersRes.users.filter((u: any) => {
          const role = String(u.role || "").toUpperCase();
          return role !== "ADMIN" && role !== "THERAPIST" && role !== "CONSULTANT";
        });
        setContextOptions(mine.map((u: any) => ({
          id: String(u.id || u._id),
          name: u.name || u.email || "Client",
          email: String(u.email || "").toLowerCase(),
          type: "Client"
        })));
      });
  }, [authUser?.id]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Resources");
  const [searchQuery, setSearchQuery] = useState<string>("");
  // Saved (bookmarked) resources come from the server's per-user list (savedBy), so they follow the account
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [savingBookmarkId, setSavingBookmarkId] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteResource = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (deletingId) return;
    const target = resources.find((r) => String(r.id) === String(id));
    const ok = window.confirm(`Delete "${target?.title || "this resource"}"?\n\nClients it was shared with will no longer see it. This can't be undone.`);
    if (!ok) return;

    setDeletingId(String(id));
    try {
      const res = await fetch(`/api/resources/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      // The server refuses resources this therapist didn't add; its reason is shown as-is
      if (!res.ok || data?.success === false) throw new Error(data?.error || `The server answered ${res.status}`);

      setResources((prev) => prev.filter((r) => String(r.id) !== String(id)));
      setBookmarkedIds((prev) => prev.filter((b) => String(b) !== String(id)));
      if (selectedResource && String(selectedResource.id) === String(id)) {
        setSelectedResource(null);
      }
      window.dispatchEvent(new CustomEvent("resource_deleted", { detail: { id } }));
      toast({ title: "Resource deleted", description: `"${target?.title || "The resource"}" was removed.` });
    } catch (err: any) {
      toast({ title: "Couldn't delete the resource", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const fetchLiveResources = () => {
    // ?email= makes the server mark each resource's isSaved for this therapist
    fetch(`/api/resources${myEmail ? `?email=${encodeURIComponent(myEmail)}` : ""}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.resources && Array.isArray(data.resources)) {
          const active: ResourceItem[] = data.resources;
          setResources(active);
          setBookmarkedIds(active.filter((r: any) => r.isSaved).map((r) => String(r.id)));
        }
      })
      .catch(() => {});
  };

  // Sync with live central resources API and bind real-time cross-panel synchronization listeners
  useEffect(() => {
    fetchLiveResources();
    // Bookmarks and resources used to be kept only in this browser; the server copy replaces them
    try {
      localStorage.removeItem("hexpertify_consultant_bookmarked_ids");
      localStorage.removeItem("hexpertify_consultant_resources");
    } catch {}

    const handleResourceDeleted = (e: any) => {
      const delId = e?.detail?.id;
      if (delId) {
        setResources((prev) => prev.filter((r) => String(r.id) !== String(delId)));
        setSelectedResource((cur) => (cur && String(cur.id) === String(delId) ? null : cur));
      } else {
        fetchLiveResources();
      }
    };

    window.addEventListener("resource_deleted", handleResourceDeleted);
    window.addEventListener("resource_data_updated", fetchLiveResources);
    window.addEventListener("focus", fetchLiveResources);

    return () => {
      window.removeEventListener("resource_deleted", handleResourceDeleted);
      window.removeEventListener("resource_data_updated", fetchLiveResources);
      window.removeEventListener("focus", fetchLiveResources);
    };
  }, [myEmail]);

  // Add Resource Modal State. Files can't be stored by the server yet, so only links can be added.
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [resourceTab, setResourceTab] = useState<"file" | "link">("link");

  // Link tab fields
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingResource, setIsSavingResource] = useState(false);

  // Who sees it is chosen explicitly: all of this therapist's clients, or specific ones (by client id)
  const [shareMode, setShareMode] = useState<"all" | "specific" | null>(null);
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [contextSearch, setContextSearch] = useState("");
  const [isContextDropdownOpen, setIsContextDropdownOpen] = useState(false);

  const toggleBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savingBookmarkId) return;
    if (!myEmail) {
      toast({ title: "Couldn't save the bookmark", description: "Please sign in again and retry.", variant: "destructive" });
      return;
    }
    const willSave = !bookmarkedIds.includes(id);
    setSavingBookmarkId(id);
    try {
      const res = await fetch(`/api/resources/${encodeURIComponent(id)}/save`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: myEmail, saved: willSave }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) throw new Error(data?.error || `The server answered ${res.status}`);
      setBookmarkedIds((prev) => (willSave ? [...prev.filter((b) => b !== id), id] : prev.filter((b) => b !== id)));
    } catch (err: any) {
      toast({
        title: willSave ? "Couldn't save the bookmark" : "Couldn't remove the bookmark",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingBookmarkId(null);
    }
  };

  const resetAddForm = () => {
    setLinkLabel("");
    setLinkUrl("");
    setFormError(null);
    setShareMode(null);
    setSelectedContexts([]);
    setContextSearch("");
    setIsContextDropdownOpen(false);
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingResource) return;
    setFormError(null);

    if (resourceTab !== "link") {
      setFormError("File upload isn't available yet — add a link instead.");
      return;
    }
    const label = linkLabel.trim();
    const url = linkUrl.trim();
    if (!label) {
      setFormError("Please give the link a label.");
      return;
    }
    if (!isValidWebUrl(url)) {
      setFormError("Please enter a full web address, like https://example.com/page.");
      return;
    }

    // Never public by default: an empty share list would show it to every client on the platform
    let sharedWith: { clientId: string; clientEmail: string }[] = [];
    if (shareMode === "all") {
      // The server keeps "all my clients" current (clients who join later see it too); today's list is sent as well
      sharedWith = contextOptions.map((opt) => ({ clientId: opt.id, clientEmail: opt.email }));
    } else if (shareMode === "specific") {
      sharedWith = contextOptions
        .filter((opt) => selectedContexts.includes(opt.id))
        .map((opt) => ({ clientId: opt.id, clientEmail: opt.email }));
      if (sharedWith.length === 0) {
        setFormError("Choose at least one client to share this with.");
        return;
      }
    } else {
      setFormError("Choose who can see this resource.");
      return;
    }

    const sharedNames = shareMode === "all"
      ? ["All my clients"]
      : contextOptions.filter((opt) => selectedContexts.includes(opt.id)).map((opt) => opt.name);
    const contextLabel = sharedNames.join(", ");

    const newResource: Record<string, any> = {
      type: "article",
      typeLabel: "LINK",
      category: "Articles",
      isPublic: false,
      sharedWith,
      shareWithAllClients: shareMode === "all",
      isSharedByTherapist: true,
      consultantId: String(authUser?.id || ""),
      consultantEmail: myEmail,
      title: label,
      description: `Link resource: ${url} (Shared with ${contextLabel})`,
      fullContent: `URL: ${url}\nLabel: ${label}`,
      externalUrl: url,
      duration: "Web Link",
      imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
      tags: sharedNames.length > 0 ? sharedNames : ["Resource"],
    };

    setIsSavingResource(true);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newResource),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false || !data?.resource) throw new Error(data?.error || `The server answered ${res.status}`);

      // Shown only once the server has stored it
      const saved = { ...data.resource, id: data.resource.id || String(data.resource._id) } as ResourceItem;
      setResources((prev) => [saved, ...prev]);
      window.dispatchEvent(new CustomEvent("resource_data_updated"));
      toast({ title: "Resource added", description: `"${label}" is now shared with ${contextLabel}.` });
      setIsAddModalOpen(false);
      resetAddForm();
    } catch (err: any) {
      setFormError(err?.message ? `Couldn't add the resource: ${err.message}` : "Couldn't add the resource. Please try again.");
    } finally {
      setIsSavingResource(false);
    }
  };

  const filteredResources = resources.filter((res) => {
    const matchesCategory =
      selectedCategory === "All Resources"
        ? true
        : selectedCategory === "Saved"
        ? bookmarkedIds.includes(res.id)
        : res.category === selectedCategory;
    const matchesSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "article":
        return <BookOpen className="w-3.5 h-3.5" />;
      case "worksheet":
        return <FileText className="w-3.5 h-3.5" />;
      case "meditation":
        return <Headphones className="w-3.5 h-3.5" />;
      case "video":
        return <Video className="w-3.5 h-3.5" />;
      case "pdf":
        return <Download className="w-3.5 h-3.5" />;
      default:
        return <BookOpen className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Resource Library"
        description="Guides, worksheets, psychoeducation materials, and client toolkits."
        badge="THERAPY RESOURCES"
        icon={<FolderOpen className="w-4 h-4 text-purple-200" />}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full border-slate-200 bg-white text-slate-900 shadow-sm focus-visible:ring-[#450bc8] h-9 text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-white text-[#450bc8] hover:bg-white/90 font-extrabold text-xs px-4 py-2.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Resource</span>
          </button>
        </div>
      </PageHeader>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20 rounded-full px-5 py-2 text-sm font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                  : "bg-white text-muted-foreground hover:text-foreground hover:bg-slate-50 border border-border rounded-full px-5 py-2 text-sm font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
              }
            >
              {cat === "Saved" && (
                <Bookmark className={`w-3.5 h-3.5 ${isActive ? "fill-white text-white" : "text-muted-foreground"}`} />
              )}
              <span>{cat}</span>
              {cat === "Saved" && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {bookmarkedIds.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid of Resource Cards */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            const isBookmarked = bookmarkedIds.includes(res.id);
            return (
              <div
                key={res.id}
                onClick={() => setSelectedResource(res)}
                className="group bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                {/* Top Image Container */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  <img
                    src={res.imageUrl}
                    alt={res.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60"></div>

                  {/* Type Label (Top-Left) */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 shadow-sm border border-white/40">
                    {getTypeIcon(res.type)}
                    <span>{res.typeLabel}</span>
                  </div>

                  {/* Action Buttons (Top-Right) */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    <button
                      onClick={(e) => toggleBookmark(res.id, e)}
                      disabled={savingBookmarkId === res.id}
                      title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
                      className="disabled:opacity-60 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md hover:bg-white text-slate-700 flex items-center justify-center shadow-md border border-white/40 transition-all hover:scale-110 active:scale-95"
                    >
                      <Bookmark
                        className={
                          isBookmarked
                            ? "w-4 h-4 fill-primary text-primary"
                            : "w-4 h-4 text-slate-600"
                        }
                      />
                    </button>
                    <button
                      onClick={(e) => handleDeleteResource(res.id, e)}
                      disabled={deletingId === String(res.id)}
                      title="Delete resource"
                      className="disabled:opacity-60 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center shadow-md border border-white/40 transition-all hover:scale-110 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>

                    <h3 className="text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                      {res.title}
                    </h3>

                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                      {res.description}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto text-xs text-muted-foreground font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{res.duration}</span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-primary group-hover:text-white text-slate-600 flex items-center justify-center transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-border text-center px-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-muted-foreground mb-4">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">No resources found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            We couldn't find any resources matching your search or selected filter.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All Resources");
            }}
            className="rounded-full"
          >
            Reset Filters
          </Button>
        </div>
      )}

      {/* View Resource Article / Worksheet Details Dialog */}
      <Dialog open={!!selectedResource} onOpenChange={() => setSelectedResource(null)}>
        {selectedResource && (
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[92vh] flex flex-col overflow-y-auto p-0 rounded-2xl gap-0">
            {/* Header Image */}
            <div className="relative h-40 sm:h-56 [@media(max-height:500px)]:h-32 shrink-0 w-full overflow-hidden bg-slate-100">
              <img
                src={selectedResource.imageUrl}
                alt={selectedResource.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 shadow-sm">
                {getTypeIcon(selectedResource.type)}
                <span>{selectedResource.typeLabel}</span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h2 className="text-xl sm:text-2xl font-bold leading-tight">
                  {selectedResource.title}
                </h2>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground border-b border-border pb-4">
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full font-medium text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{selectedResource.duration}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-auto">
                  {selectedResource.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[11px] font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4 text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                <p className="font-medium text-base text-foreground leading-snug">
                  {selectedResource.description}
                </p>

                {selectedResource.fullContent && (
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 text-sm space-y-3">
                    {selectedResource.fullContent}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => toggleBookmark(selectedResource.id, e)}
                  disabled={savingBookmarkId === selectedResource.id}
                  className="rounded-full gap-2"
                >
                  <Bookmark
                    className={
                      bookmarkedIds.includes(selectedResource.id)
                        ? "w-4 h-4 fill-primary text-primary"
                        : "w-4 h-4"
                    }
                  />
                  <span>
                    {bookmarkedIds.includes(selectedResource.id) ? "Saved" : "Save Bookmark"}
                  </span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-2 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => handleDeleteResource(selectedResource.id)}
                    disabled={deletingId === String(selectedResource.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deletingId === String(selectedResource.id) ? "Deleting…" : "Delete"}</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="rounded-full gap-2 font-semibold bg-primary hover:bg-primary/90"
                    onClick={() => setSelectedResource(null)}
                  >
                    <span>Close</span>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Add New Resource Modal (links only: the server can't store uploaded files yet) */}
      <Dialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-0 shadow-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-extrabold text-slate-900">Add a resource</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Add a link to an article, video or worksheet and choose which of your clients can see it.
            </DialogDescription>
          </DialogHeader>

          {/* Type Selector (File / Link Tabs) */}
          <div className="flex justify-center my-2">
            <div className="inline-flex items-center bg-purple-50/80 p-1 rounded-xl border border-purple-100/80 gap-1">
              <button
                type="button"
                onClick={() => setResourceTab("file")}
                title="File upload isn't available yet"
                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  resourceTab === "file"
                    ? "bg-white text-[#450bc8] shadow-xs border border-purple-100"
                    : "text-slate-400 hover:text-slate-600 font-semibold"
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>File</span>
              </button>
              <button
                type="button"
                onClick={() => setResourceTab("link")}
                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  resourceTab === "link"
                    ? "bg-white text-[#450bc8] shadow-xs border border-purple-100"
                    : "text-slate-500 hover:text-slate-800 font-semibold"
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Link</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleAddResource} className="space-y-4 mt-2" noValidate>
            {/* FILE TAB: not available yet, said plainly instead of pretending to upload */}
            {resourceTab === "file" && (
              <div className="border border-dashed border-slate-300 bg-slate-50/60 rounded-2xl p-6 text-center flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">File upload isn't available yet — add a link instead.</p>
                <button
                  type="button"
                  onClick={() => setResourceTab("link")}
                  className="text-xs font-bold text-[#450bc8] hover:underline cursor-pointer"
                >
                  Add a link
                </button>
              </div>
            )}

            {/* LINK TAB */}
            {resourceTab === "link" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800">
                    Label <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    A label for the link
                  </p>
                  <Input
                    type="text"
                    placeholder=""
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    className="rounded-xl border-slate-200 h-10 text-xs focus-visible:ring-[#450bc8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800">
                    URL <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    The full web address, starting with https://
                  </p>
                  <Input
                    type="url"
                    placeholder="https://example.com/article"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="rounded-xl border-slate-200 h-10 text-xs focus-visible:ring-[#450bc8]"
                  />
                  {linkUrl.trim() && !isValidWebUrl(linkUrl) && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">Enter a full web address, like https://example.com/page.</p>
                  )}
                </div>
              </div>
            )}

            {/* WHO CAN SEE IT: always an explicit choice, never public to every client by default */}
            {resourceTab === "link" && (
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-extrabold text-slate-800">
                  Share with <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShareMode("all")}
                    className={`px-3 py-2.5 rounded-xl border text-xs text-left transition-colors cursor-pointer ${
                      shareMode === "all"
                        ? "bg-purple-50 border-[#450bc8]/40 text-[#450bc8] font-bold"
                        : "bg-white border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                    }`}
                  >
                    All my clients
                    <span className="block text-[10px] font-medium text-slate-500 mt-0.5">
                      {contextOptions.length} current client{contextOptions.length === 1 ? "" : "s"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareMode("specific")}
                    className={`px-3 py-2.5 rounded-xl border text-xs text-left transition-colors cursor-pointer ${
                      shareMode === "specific"
                        ? "bg-purple-50 border-[#450bc8]/40 text-[#450bc8] font-bold"
                        : "bg-white border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                    }`}
                  >
                    Specific clients
                    <span className="block text-[10px] font-medium text-slate-500 mt-0.5">Pick who can see it</span>
                  </button>
                </div>
                {shareMode === "all" && (
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Shared with all your current clients, and with clients who join you later.
                  </p>
                )}
              </div>
            )}

            {resourceTab === "link" && shareMode === "specific" && (
            <div className="space-y-1">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Find a client by name"
                    value={contextSearch}
                    onFocus={() => setIsContextDropdownOpen(true)}
                    onChange={(e) => {
                      setContextSearch(e.target.value);
                      setIsContextDropdownOpen(true);
                    }}
                    className="pl-10 pr-10 rounded-xl border-slate-200 h-10 text-xs focus-visible:ring-[#450bc8]"
                  />
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {isContextDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsContextDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-1 space-y-0.5 animate-in fade-in-50 zoom-in-95">
                      {contextOptions.length === 0 && (
                        <p className="px-3 py-2 text-xs text-slate-400">You don't have any clients yet.</p>
                      )}
                      {contextOptions.filter((opt) =>
                        opt.name.toLowerCase().includes(contextSearch.toLowerCase())
                      ).map((opt) => {
                        const isSelected = selectedContexts.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedContexts((prev) => prev.filter((n) => n !== opt.id));
                              } else {
                                setSelectedContexts((prev) => [...prev, opt.id]);
                              }
                            }}
                            className={`w-full px-3 py-2 text-left rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-purple-50 text-[#450bc8] font-bold"
                                : "hover:bg-slate-50 text-slate-700 font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{opt.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-normal">
                                {opt.type}
                              </span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#450bc8]" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="mt-2 min-h-[20px]">
                {selectedContexts.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium">No clients selected yet</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedContexts.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-[#450bc8] font-semibold text-xs px-2.5 py-1 rounded-full"
                      >
                        <span>{contextOptions.find((opt) => opt.id === id)?.name || "Client"}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedContexts((prev) => prev.filter((n) => n !== id))}
                          className="hover:bg-purple-200/50 rounded-full p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}

            {formError && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{formError}</p>
            )}

            <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetAddForm();
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingResource || resourceTab !== "link"}
                className="px-5 py-2 bg-[#450bc8] hover:bg-[#3a0aa8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                {isSavingResource ? "Saving…" : "Save"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
