import { useState, useEffect } from "react";
import { FolderOpen, Search, Plus, ExternalLink, Download, FileText, Headphones, Video, BookOpen, Clock, Tag, Globe, Lock, Bookmark, Star, ArrowRight, Info, Upload, Link as LinkIcon, FileUp, ChevronDown, Check, X, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getAuthUser } from "@/lib/auth";
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

const INITIAL_RESOURCES: ResourceItem[] = [
  {
    id: "res-2",
    type: "worksheet",
    typeLabel: "WORKSHEET",
    category: "Worksheets",
    isRecommended: true,
    title: "Cognitive Distortions Reference Guide & Worksheet",
    description: "Identify and reframe the 10 most common unhelpful thinking habits with real-life examples.",
    fullContent: `Cognitive distortions are biased ways of thinking that reinforce negative emotions. Use this guide to identify automatic thoughts and reframe them into objective perspectives.

### Common Distortions Covered:
1. **All-or-Nothing Thinking:** Seeing things in black-and-white categories.
2. **Catastrophizing:** Expecting the worst possible outcome.
3. **Mind Reading:** Assuming you know what others are thinking without evidence.
4. **Emotional Reasoning:** Assuming feelings reflect objective reality ("I feel anxious, so it must be dangerous").

### Practical Reframing Exercise:
Write down the triggering situation, your automatic thought, the cognitive distortion type, and an alternative balanced thought.`,
    duration: "8 min read",
    imageUrl: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80",
    tags: ["CBT", "Reframing", "Cognitive Health", "Self-Reflection"]
  },
  {
    id: "res-3",
    type: "meditation",
    typeLabel: "MEDITATION",
    category: "Meditations",
    isRecommended: false,
    title: "15-Minute Progressive Muscle Relaxation (PMR)",
    description: "Guided audio session systematically tensing and relaxing major muscle groups to release somatic tension.",
    fullContent: `Progressive Muscle Relaxation (PMR) is an evidence-based exercise designed to reduce muscular tension and sympathetic nervous system activation.

### Guided Steps:
1. Sit or lie down comfortably in a quiet room.
2. Tense your toes and feet firmly for 5 seconds, then suddenly release completely. Notice the sensation of warmth and relaxation.
3. Move systematically upward through calf muscles, thighs, abdomen, chest, shoulders, arms, hands, neck, and face.
4. Conclude with 3 deep abdominal breaths, enjoying total body lightness.`,
    duration: "15 min listen",
    imageUrl: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80",
    tags: ["Mindfulness", "PMR", "Stress Release", "Body Scan"]
  },
  {
    id: "res-4",
    type: "video",
    typeLabel: "VIDEO",
    category: "Videos",
    isRecommended: true,
    title: "Diaphragmatic Breathing & Vagus Nerve Stimulation",
    description: "Visual walkthrough and biofeedback demonstration for activating the parasympathetic nervous system.",
    fullContent: `Diaphragmatic breathing (belly breathing) expands the diaphragm, pulling air deep into the lower lungs and signaling safety to the autonomic nervous system.

### Key Takeaways:
- Place one hand on your upper chest and the other on your abdomen.
- Breathe in slowly through your nose so your abdominal hand rises while your chest hand stays quiet.
- Exhale slowly through pursed lips, allowing abdominal muscles to collapse inward.
- Practicing 5–10 minutes daily lowers cortisol levels and improves baseline heart rate variability (HRV).`,
    duration: "10 min video",
    imageUrl: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80",
    tags: ["Vagus Nerve", "Breathing", "Biofeedback", "Autonomic Relief"]
  },
  {
    id: "res-5",
    type: "pdf",
    typeLabel: "PDF",
    category: "PDFs",
    isRecommended: false,
    title: "Sleep Hygiene & Circadian Rhythm Protocol",
    description: "Evidence-based checklist for evening wind-down rituals, light exposure management, and sleep tracking.",
    fullContent: `Quality sleep is foundational for emotional regulation and cognitive health. This protocol provides non-pharmacological guidelines for restorative rest.

### Core Guidelines:
- **Morning Sunlight:** Get 10–15 minutes of direct sunlight within 1 hour of waking.
- **Screen Cutoff:** Turn off blue-light emitting screens 60 minutes before bed.
- **Temperature Control:** Keep bedroom cool (around 65°F / 18°C).
- **Consistent Wake Time:** Wake up at the same time daily, even on weekends.`,
    duration: "6 min read",
    imageUrl: "https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=800&q=80",
    tags: ["Sleep", "Circadian Rhythm", "Wellness", "Checklist"]
  },
  {
    id: "res-6",
    type: "worksheet",
    typeLabel: "WORKSHEET",
    category: "Worksheets",
    isRecommended: false,
    title: "5-Column CBT Thought Record & Restructuring",
    description: "Structured exercise to log distressing situations, catch automatic thoughts, and form balanced perspectives.",
    fullContent: `The 5-Column Thought Record is one of the most effective tools in Cognitive Behavioral Therapy for modifying unhelpful thought patterns.

### Column Structure:
1. **Situation:** Who, what, when, where?
2. **Automatic Thought:** What thoughts or images went through your mind? (Rate belief 0–100%)
3. **Emotion:** What did you feel? (Rate intensity 0–100%)
4. **Evidence:** Facts supporting vs. facts contradicting the automatic thought.
5. **Alternative Thought:** Objective, realistic perspective (Re-rate emotion intensity).`,
    duration: "12 min read",
    imageUrl: "https://images.unsplash.com/photo-1499209974431-9dac3ada00d7?auto=format&fit=crop&w=800&q=80",
    tags: ["CBT", "Thought Record", "Restructuring", "Journaling"]
  }
];

const CATEGORIES = ["All Resources", "Saved", "Articles", "Videos", "Worksheets", "Meditations", "PDFs"];

export default function Resources() {
  const authUser = getAuthUser();
  const [resources, setResources] = useState<ResourceItem[]>(() => {
    try {
      const saved = localStorage.getItem("hexpertify_consultant_resources");
      return saved ? JSON.parse(saved) : INITIAL_RESOURCES;
    } catch {
      return INITIAL_RESOURCES;
    }
  });

  // The therapist's own clients (assigned to them or booked with them), for sharing
  const [contextOptions, setContextOptions] = useState<{ id: string; name: string; email: string; type: string }[]>([]);
  useEffect(() => {
    const myId = String(authUser?.id || "");
    const myEmail = String(authUser?.email || "").toLowerCase();
    if (!myId && !myEmail) return;
    const q = `?consultantId=${encodeURIComponent(myId)}&consultantName=${encodeURIComponent(authUser?.name || "")}&role=client`;
    Promise.all([
      fetch(`/api/users${q}`).then((r) => (r.ok ? r.json() : { users: [] })).catch(() => ({ users: [] })),
      fetch(`/api/bookings${q}`).then((r) => (r.ok ? r.json() : { bookings: [] })).catch(() => ({ bookings: [] }))
    ]).then(([usersRes, bookingsRes]) => {
      const users: any[] = Array.isArray(usersRes?.users) ? usersRes.users : [];
      const bookings: any[] = Array.isArray(bookingsRes?.bookings) ? bookingsRes.bookings : [];
      const myBookings = bookings.filter((b) => myId && String(b.consultantId || b.therapistId || "") === myId);
      const mine = users.filter((u) => {
        const role = String(u.role || "").toUpperCase();
        if (role === "ADMIN" || role === "THERAPIST" || role === "CONSULTANT") return false;
        const assigned = (myId && String(u.assignedTherapistId || "") === myId) ||
          (myEmail && String(u.assignedTherapistEmail || "").toLowerCase() === myEmail);
        const booked = myBookings.some((b) =>
          (b.clientEmail && String(u.email || "").toLowerCase() === String(b.clientEmail).toLowerCase()) ||
          (b.clientId && (String(u.id) === String(b.clientId) || String(u._id) === String(b.clientId))));
        return assigned || booked;
      });
      setContextOptions(mine.map((u) => ({
        id: String(u.id || u._id),
        name: u.name || u.email || "Client",
        email: String(u.email || "").toLowerCase(),
        type: "Client"
      })));
    });
  }, [authUser?.id, authUser?.email]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Resources");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("hexpertify_consultant_bookmarked_ids");
      if (saved) return JSON.parse(saved);
    } catch {}
    return ["res-2"];
  });
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);

  const handleDeleteResource = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setResources((prev) => prev.filter((r) => String(r.id) !== String(id)));
    if (selectedResource && String(selectedResource.id) === String(id)) {
      setSelectedResource(null);
    }
    try {
      const saved = localStorage.getItem("hexpertify_consultant_resources");
      if (saved) {
        const parsed = JSON.parse(saved);
        localStorage.setItem("hexpertify_consultant_resources", JSON.stringify(parsed.filter((r: any) => String(r.id) !== String(id))));
      }
      const clientSaved = localStorage.getItem("hexpertify_client_resources");
      if (clientSaved) {
        const parsed = JSON.parse(clientSaved);
        localStorage.setItem("hexpertify_client_resources", JSON.stringify(parsed.filter((r: any) => String(r.id) !== String(id))));
      }
      const adminSaved = localStorage.getItem("hexpertify_admin_resources");
      if (adminSaved) {
        const parsed = JSON.parse(adminSaved);
        localStorage.setItem("hexpertify_admin_resources", JSON.stringify(parsed.filter((r: any) => String(r.id) !== String(id))));
      }
    } catch {}

    window.dispatchEvent(new CustomEvent("resource_deleted", { detail: { id } }));
    window.dispatchEvent(new CustomEvent("resource_data_updated"));

    // Deleted from Resource and resources on the server; on failure the list is reloaded from it
    fetch(`/api/resources/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then((res) => { if (!res.ok) fetchLiveResources(); })
      .catch(() => fetchLiveResources());
  };

  const fetchLiveResources = () => {
    fetch("/api/resources")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.resources && Array.isArray(data.resources)) {
          const active: ResourceItem[] = data.resources;
          setResources(active);
          try {
            localStorage.setItem("hexpertify_consultant_resources", JSON.stringify(active));
          } catch {}
        }
      })
      .catch(() => {});
  };

  // Sync with live central resources API and bind real-time cross-panel synchronization listeners
  useEffect(() => {
    fetchLiveResources();

    const handleResourceDeleted = (e: any) => {
      const delId = e?.detail?.id;
      if (delId) {
        setResources((prev) => prev.filter((r) => String(r.id) !== String(delId)));
        if (selectedResource && String(selectedResource.id) === String(delId)) {
          setSelectedResource(null);
        }
      } else {
        fetchLiveResources();
      }
    };

    window.addEventListener("resource_deleted", handleResourceDeleted);
    window.addEventListener("resource_data_updated", fetchLiveResources);
    window.addEventListener("storage", fetchLiveResources);
    window.addEventListener("focus", fetchLiveResources);

    return () => {
      window.removeEventListener("resource_deleted", handleResourceDeleted);
      window.removeEventListener("resource_data_updated", fetchLiveResources);
      window.removeEventListener("storage", fetchLiveResources);
      window.removeEventListener("focus", fetchLiveResources);
    };
  }, []);

  // Add Resource Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [resourceTab, setResourceTab] = useState<"file" | "link">("file");

  // File tab fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Link tab fields
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");

  // Context field
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [contextSearch, setContextSearch] = useState("");
  const [isContextDropdownOpen, setIsContextDropdownOpen] = useState(false);

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextBookmarked = bookmarkedIds.includes(id)
      ? bookmarkedIds.filter((item) => item !== id)
      : [...bookmarkedIds, id];
    setBookmarkedIds(nextBookmarked);
    try {
      localStorage.setItem("hexpertify_consultant_bookmarked_ids", JSON.stringify(nextBookmarked));
    } catch {}
  };

  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (resourceTab === "file" && !selectedFile) return;
    if (resourceTab === "link" && (!linkLabel.trim() || !linkUrl.trim())) return;

    const title = resourceTab === "file" ? (selectedFile?.name || "Uploaded Resource") : linkLabel.trim();
    const contextLabel = selectedContexts.length > 0 ? selectedContexts.join(", ") : "General";
    // Shared with the chosen clients only; no clients chosen = visible to every client
    const sharedWith = contextOptions
      .filter((opt) => selectedContexts.includes(opt.name))
      .map((opt) => ({ clientId: opt.id, clientEmail: opt.email }));

    const newResource: ResourceItem = {
      id: `res-${Date.now()}`,
      type: resourceTab === "file" ? "pdf" : "article",
      typeLabel: resourceTab === "file" ? "FILE" : "LINK",
      category: resourceTab === "file" ? "PDFs" : "Articles",
      isPublic: sharedWith.length === 0,
      sharedWith,
      title: title,
      description: resourceTab === "file"
        ? `File resource shared with ${contextLabel}`
        : `Link resource: ${linkUrl.trim()} (Shared with ${contextLabel})`,
      fullContent: resourceTab === "file"
        ? `Uploaded file: ${selectedFile?.name} (${selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) : 0} MB)`
        : `URL: ${linkUrl.trim()}\nLabel: ${linkLabel.trim()}`,
      duration: resourceTab === "file" ? "Document" : "Web Link",
      imageUrl: resourceTab === "file"
        ? "https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=800&q=80"
        : "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
      tags: selectedContexts.length > 0 ? selectedContexts : ["Resource"],
    };

    setResources((prev) => [newResource, ...prev]);
    try {
      localStorage.setItem("hexpertify_consultant_resources", JSON.stringify([newResource, ...resources]));
    } catch {}
    fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newResource),
    }).catch(() => {});
    setIsAddModalOpen(false);

    // Reset Form
    setSelectedFile(null);
    setLinkLabel("");
    setLinkUrl("https://");
    setSelectedContexts([]);
    setContextSearch("");
    setIsContextDropdownOpen(false);
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
              className="pl-10 rounded-full border-slate-200 bg-white text-slate-900 shadow-sm focus-visible:ring-[#5e2be2] h-9 text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-white text-[#5e2be2] hover:bg-white/90 font-extrabold text-xs px-4 py-2.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md hover:bg-white text-slate-700 flex items-center justify-center shadow-md border border-white/40 transition-all hover:scale-110 active:scale-95"
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
                      title="Delete resource"
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center shadow-md border border-white/40 transition-all hover:scale-110 active:scale-95"
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
            <div className="relative h-56 w-full overflow-hidden bg-slate-100">
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
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
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

      {/* Add New Resource / File Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-0 shadow-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-extrabold text-slate-900">Add a resource</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              You can add a file or a link as a resource. Choose the type of the resource that you want to add below.
            </DialogDescription>
          </DialogHeader>

          {/* Type Selector (File / Link Tabs) */}
          <div className="flex justify-center my-2">
            <div className="inline-flex items-center bg-purple-50/80 p-1 rounded-xl border border-purple-100/80 gap-1">
              <button
                type="button"
                onClick={() => setResourceTab("file")}
                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  resourceTab === "file"
                    ? "bg-white text-[#5e2be2] shadow-xs border border-purple-100"
                    : "text-slate-500 hover:text-slate-800 font-semibold"
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
                    ? "bg-white text-[#5e2be2] shadow-xs border border-purple-100"
                    : "text-slate-500 hover:text-slate-800 font-semibold"
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Link</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleAddResource} className="space-y-4 mt-2">
            {/* FILE TAB */}
            {resourceTab === "file" && (
              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-800">
                  File <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  You can add a file to the client's resources
                </p>

                <label
                  htmlFor="file-upload-input"
                  className="border border-dashed border-slate-300 hover:border-[#5e2be2] bg-slate-50/50 hover:bg-purple-50/20 rounded-2xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition-all space-y-2 group"
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm w-full max-w-sm">
                      <FileText className="w-7 h-7 text-[#5e2be2] shrink-0" />
                      <div className="text-left overflow-hidden flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-purple-100 text-slate-600 group-hover:text-[#5e2be2] flex items-center justify-center transition-colors">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-medium text-slate-700">
                        <span className="text-[#5e2be2] font-bold">Upload a file</span> or drag and drop
                      </div>
                    </>
                  )}
                </label>
                <div className="text-right text-[11px] text-slate-400 font-medium pt-0.5">
                  up to 25MB
                </div>
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
                    className="rounded-xl border-slate-200 h-10 text-xs focus-visible:ring-[#5e2be2]"
                    required={resourceTab === "link"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800">
                    URL <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    The url for the link
                  </p>
                  <Input
                    type="text"
                    placeholder="https://"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="rounded-xl border-slate-200 h-10 text-xs focus-visible:ring-[#5e2be2]"
                    required={resourceTab === "link"}
                  />
                </div>
              </div>
            )}

            {/* CONTEXT FIELD (SHARED) */}
            <div className="space-y-1 pt-1">
              <label className="block text-xs font-extrabold text-slate-800">
                Context
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5 leading-snug">
                Select the clients or groups this resource is associated with. Use the sharing toggle to control whether they have access to it.
              </p>

              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Find a client or group by name"
                    value={contextSearch}
                    onFocus={() => setIsContextDropdownOpen(true)}
                    onChange={(e) => {
                      setContextSearch(e.target.value);
                      setIsContextDropdownOpen(true);
                    }}
                    className="pl-10 pr-10 rounded-xl border-slate-200 h-10 text-xs focus-visible:ring-[#5e2be2]"
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
                      {contextOptions.filter((opt) =>
                        opt.name.toLowerCase().includes(contextSearch.toLowerCase())
                      ).map((opt) => {
                        const isSelected = selectedContexts.includes(opt.name);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedContexts((prev) => prev.filter((n) => n !== opt.name));
                              } else {
                                setSelectedContexts((prev) => [...prev, opt.name]);
                              }
                            }}
                            className={`w-full px-3 py-2 text-left rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-purple-50 text-[#5e2be2] font-bold"
                                : "hover:bg-slate-50 text-slate-700 font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{opt.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-normal">
                                {opt.type}
                              </span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#5e2be2]" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="mt-2 min-h-[20px]">
                {selectedContexts.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium">No clients or groups selected yet</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedContexts.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-[#5e2be2] font-semibold text-xs px-2.5 py-1 rounded-full"
                      >
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedContexts((prev) => prev.filter((n) => n !== name))}
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

            <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Save
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
