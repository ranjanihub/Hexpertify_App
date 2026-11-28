import { useState, useEffect } from "react";
import { 
  Activity, 
  Clock, 
  Calendar as CalendarIcon, 
  Plus,
  Search,
  Check,
  MoreVertical,
  UserPlus,
  Pencil,
  Trash2,
  Users,
  Eye,
  Repeat,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { ActivityGamePlayer } from "@/components/activity-game-player";
import { cn } from "@/lib/utils";
import { getAuthUser } from "@/lib/auth";

export interface ClientAssignment {
  clientName: string;
  frequency: string; // Frequency per client (e.g. Daily, 2-3 Times / Week, Weekly, As Needed)
  timeOfDay?: string; // Preferred time of day per client
}

export interface ActivityItem {
  id: number | string;
  title: string;
  description: string;
  category: "MINDFULNESS" | "CBT" | "GRATITUDE" | "BREATHING" | "SOMATIC" | string;
  difficulty: "Easy" | "Medium" | "Hard" | string;
  duration: string;
  dueDate: string;
  imageUrl: string;
  status: "pending" | "completed" | string;
  instructions?: string;
  completedAt?: string | null;
  assignedTo?: string[]; // Multiple assigned client names
  clientAssignments?: ClientAssignment[]; // Per-client frequency schedule!
  frequency?: string; // Default fallback frequency
  timeOfDay?: string; // Default time of day
}

const FREQUENCY_OPTIONS = [
  { id: "Daily", label: "Daily", description: "Once every day (Recommended)", icon: "⚡" },
  { id: "2-3 Times / Week", label: "2-3 Times / Week", description: "Flexible practice 2 to 3 days a week", icon: "📅" },
  { id: "Weekly", label: "Weekly", description: "Once a week on a set day", icon: "🗓️" },
  { id: "Bi-Weekly", label: "Bi-Weekly", description: "Every 2 weeks", icon: "🔄" },
  { id: "As Needed", label: "As Needed", description: "During acute anxiety or stress triggers", icon: "🆘" },
];

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_SLOTS = ["Morning (8:00 AM)", "Afternoon (1:00 PM)", "Evening (7:00 PM)", "Before Bed (10:00 PM)", "Any Time"];

const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 1,
    title: "Morning Mindfulness Meditation",
    description: "10-minute guided breathing session focusing on awareness of breath and body sensations.",
    category: "MINDFULNESS",
    difficulty: "Easy",
    duration: "10 min",
    dueDate: "Today",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
    status: "pending",
    instructions: "1. Sit in a comfortable position with your spine upright but relaxed.\n2. Gently close your eyes and bring awareness to your breath.\n3. Observe the sensation of air flowing in through your nose and out through your mouth.\n4. Whenever your mind drifts to thoughts, acknowledge them without judgment and return to the breath.",
    assignedTo: ["Sarah Jenkins", "Michael Chen"],
    clientAssignments: [
      { clientName: "Sarah Jenkins", frequency: "Daily", timeOfDay: "Morning (8:00 AM)" },
      { clientName: "Michael Chen", frequency: "2-3 Times / Week", timeOfDay: "Evening (7:00 PM)" }
    ],
    frequency: "Daily",
    timeOfDay: "Morning (8:00 AM)"
  },
  {
    id: 2,
    title: "CBT Thought Record Entry",
    description: "Document recent anxiety trigger and write a balanced, rational reframe using the 5-column technique.",
    category: "CBT",
    difficulty: "Medium",
    duration: "15 min",
    dueDate: "Today",
    imageUrl: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80",
    status: "pending",
    instructions: "1. Record the triggering situation (Where were you? Who was there?).\n2. Catch your automatic thought and rate how strongly you believed it (0-100%).\n3. Note down the emotional response and physical sensations.\n4. Challenge the thought by listing objective evidence for and against.\n5. Formulate a balanced, realistic replacement thought.",
    assignedTo: ["Emily Rodriguez", "David Kim"],
    clientAssignments: [
      { clientName: "Emily Rodriguez", frequency: "Daily", timeOfDay: "Evening (7:00 PM)" },
      { clientName: "David Kim", frequency: "As Needed", timeOfDay: "Any Time" }
    ],
    frequency: "2-3 Times / Week",
    timeOfDay: "Evening (7:00 PM)"
  },
  {
    id: 3,
    title: "Evening Gratitude Journaling",
    description: "Write down 3 things you felt grateful for today and reflect on why they mattered.",
    category: "GRATITUDE",
    difficulty: "Easy",
    duration: "8 min",
    dueDate: "Today",
    imageUrl: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80",
    status: "pending",
    instructions: "1. Take 2 slow abdominal breaths.\n2. Write down 3 specific things from today that brought you warmth, joy, or relief.\n3. For each item, write 1-2 sentences about *why* it was meaningful.\n4. Rest quietly for a moment to absorb the positive emotions.",
    assignedTo: ["Amanda Miller", "Alex Morgan"],
    clientAssignments: [
      { clientName: "Amanda Miller", frequency: "Daily", timeOfDay: "Before Bed (10:00 PM)" },
      { clientName: "Alex Morgan", frequency: "Weekly", timeOfDay: "Evening (7:00 PM)" }
    ],
    frequency: "Daily",
    timeOfDay: "Before Bed (10:00 PM)"
  },
  {
    id: 4,
    title: "4-7-8 Parasympathetic Breathing",
    description: "Calm your nervous system using rhythmic 4-second inhale, 7-second hold, and 8-second exhale.",
    category: "BREATHING",
    difficulty: "Easy",
    duration: "5 min",
    dueDate: "Tomorrow",
    imageUrl: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80",
    status: "pending",
    instructions: "1. Place tip of tongue against ridge behind upper front teeth.\n2. Exhale completely through mouth with a gentle whoosh sound.\n3. Inhale silently through nose for 4 seconds.\n4. Hold breath for 7 seconds.\n5. Exhale through mouth for 8 seconds. Repeat 4 cycles.",
    assignedTo: ["Sarah Jenkins", "Emily Rodriguez"],
    clientAssignments: [
      { clientName: "Sarah Jenkins", frequency: "As Needed", timeOfDay: "Any Time" },
      { clientName: "Emily Rodriguez", frequency: "Daily", timeOfDay: "Morning (8:00 AM)" }
    ],
    frequency: "As Needed",
    timeOfDay: "Any Time"
  },
  {
    id: 5,
    title: "Progressive Muscle Relaxation (PMR)",
    description: "Systematically tense and release muscle groups from toes to head to dissolve physical anxiety.",
    category: "SOMATIC",
    difficulty: "Medium",
    duration: "12 min",
    dueDate: "Completed",
    imageUrl: "https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=800&q=80",
    status: "completed",
    instructions: "Tense each muscle group firmly for 5s, then release completely.",
    completedAt: "Jul 30, 2026 at 6:45 PM",
    assignedTo: ["Sarah Jenkins"],
    clientAssignments: [
      { clientName: "Sarah Jenkins", frequency: "Weekly", timeOfDay: "Evening (7:00 PM)" }
    ],
    frequency: "Weekly",
    timeOfDay: "Evening (7:00 PM)"
  }
];

const CATEGORIES = ["All", "MINDFULNESS", "CBT", "GRATITUDE", "BREATHING", "SOMATIC"];

export default function ActivitiesPage() {
  const { toast } = useToast();
  const authUser = getAuthUser();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  // This therapist's own assignments (ActivityAssignment), shown on each template card
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Consultant's assigned clients state
  const [clientList, setClientList] = useState<string[]>([]);
  const [clientObjects, setClientObjects] = useState<{ id: string; name: string; email: string }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState<boolean>(true);

  // Preview Activity Modal State
  const [activeActivity, setActiveActivity] = useState<ActivityItem | null>(null);

  // Assign Modal Multi-Step State
  const [assignModalActivity, setAssignModalActivity] = useState<ActivityItem | null>(null);
  const [assignStep, setAssignStep] = useState<1 | 2>(1);
  const [selectedClientsToAssign, setSelectedClientsToAssign] = useState<string[]>([]);
  const [clientFrequencies, setClientFrequencies] = useState<Record<string, { frequency: string; timeOfDay: string }>>({});

  // Edit Modal State
  const [editModalActivity, setEditModalActivity] = useState<ActivityItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("MINDFULNESS");
  const [editDifficulty, setEditDifficulty] = useState("Easy");
  const [editDuration, setEditDuration] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editInstructions, setEditInstructions] = useState("");

  // Load clients strictly assigned under this consultant
  useEffect(() => {
    const fetchConsultantClients = async () => {
      try {
        setIsLoadingClients(true);
        const myId = String(authUser?.id || '');
        if (!myId) return;

        // By id only: the server returns just this therapist's clients (no name matching)
        const usersRes = await fetch(`/api/users?therapistId=${encodeURIComponent(myId)}`)
          .then(r => r.ok ? r.json() : null).catch(() => null);
        if (!Array.isArray(usersRes?.users)) return;

        const myUsers = usersRes.users.filter((u: any) => {
          const role = String(u.role || '').toUpperCase();
          return role !== 'ADMIN' && role !== 'THERAPIST' && role !== 'CONSULTANT';
        });

        const cObjs = myUsers.map((u: any) => ({
          id: String(u._id || u.id || ''),
          name: u.name || 'Client User',
          email: u.email || ''
        }));
        setClientObjects(cObjs);

        const clientNames: string[] = Array.from(new Set(cObjs.map((c: any) => String(c.name)).filter(Boolean)));
        setClientList(clientNames);
      } catch (err) {
        console.error('Failed to load consultant clients in activities:', err);
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchConsultantClients();
    window.addEventListener('auth_state_change', fetchConsultantClients);
    window.addEventListener('client_data_updated', fetchConsultantClients);
    return () => {
      window.removeEventListener('auth_state_change', fetchConsultantClients);
      window.removeEventListener('client_data_updated', fetchConsultantClients);
    };
  }, [authUser?.id, authUser?.name]);

  // Activity templates come from the API ({ success, activities }); the built-in list is only an
  // empty-state fallback, without assignees
  const emptyStateActivities = () =>
    INITIAL_ACTIVITIES.map((a) => ({ ...a, status: "pending", completedAt: null, assignedTo: [], clientAssignments: [] }));

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const res = await fetch("/api/activities");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data?.activities) ? data.activities : Array.isArray(data) ? data : [];
        if (list.length === 0) {
          setActivities(emptyStateActivities());
          return;
        }
        setActivities(list.map((item: any) => ({
          ...item,
          id: item.id || item._id,
          title: item.title || item.name || "Activity",
          description: item.description || item.howItHelps || "",
          category: String(item.category || item.categoryTag || "MINDFULNESS").toUpperCase(),
          difficulty: item.difficulty || "Easy",
          duration: item.duration || "",
          dueDate: item.dueDate || "",
          imageUrl: item.imageUrl || "",
          status: "pending",
          // The template's own lists hold every therapist's clients: this page shows only ours
          assignedTo: [],
          clientAssignments: [],
          frequency: item.frequency || "Daily",
          timeOfDay: item.timeOfDay || "Morning (8:00 AM)"
        })));
      } catch (err) {
        setActivities(emptyStateActivities());
      }
    };
    loadActivities();
  }, []);

  const loadMyAssignments = async () => {
    const myId = String(authUser?.id || "");
    if (!myId) return;
    try {
      const res = await fetch(`/api/activities/assignments?consultantId=${encodeURIComponent(myId)}`);
      const data = res.ok ? await res.json() : null;
      setMyAssignments(Array.isArray(data?.assignments) ? data.assignments : []);
    } catch {
      // Keep the last known assignments
    }
  };

  useEffect(() => {
    loadMyAssignments();
  }, [authUser?.id]);

  // Template cards show this therapist's own assignees and per-client schedule
  const activitiesWithAssignments: ActivityItem[] = activities.map((act) => {
    const mine = myAssignments.filter((a) => String(a.activityId) === String(act.id));
    if (mine.length === 0) return act;
    return {
      ...act,
      assignedTo: Array.from(new Set(mine.map((a) => String(a.clientName || a.clientEmail)))),
      clientAssignments: mine.map((a) => ({ clientName: String(a.clientName || a.clientEmail), frequency: a.frequency, timeOfDay: a.timeOfDay })),
      status: mine.every((a) => a.status === "completed") ? "completed" : "pending",
      completedAt: mine.find((a) => a.completedAt)?.completedAt ? new Date(mine.find((a) => a.completedAt).completedAt).toLocaleString() : act.completedAt
    };
  });

  // Opens the activity as a full page (like the client panel), from the top
  const handlePreviewActivity = (act: ActivityItem) => {
    setActiveActivity(act);
    try { document.querySelector("main")?.scrollTo({ top: 0 }); window.scrollTo({ top: 0 }); } catch {}
  };

  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const handleDelete = async (act: ActivityItem) => {
    if (deletingId !== null) return;
    // Templates live in the shared library, so deleting one removes it for everyone: ask first
    const ok = window.confirm(`Delete "${act.title}" from the activity library?\n\nThis removes it for all therapists and clients and can't be undone.`);
    if (!ok) return;

    setDeletingId(act.id);
    try {
      const res = await fetch(`/api/activities/${encodeURIComponent(String(act.id))}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) throw new Error(data?.error || data?.message || `The server answered ${res.status}`);

      // Removed from the list only once the server has confirmed the delete
      setActivities((prev) => prev.filter((item) => item.id !== act.id));
      toast({ title: "Activity deleted", description: `"${act.title}" was removed from the library.` });
    } catch (err: any) {
      toast({
        title: "Couldn't delete the activity",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const openAssignModal = (act: ActivityItem, targetClient?: string) => {
    setAssignModalActivity(act);
    setAssignStep(targetClient ? 2 : 1);
    const clients = targetClient 
      ? [targetClient] 
      : (act.assignedTo && act.assignedTo.length > 0
          ? act.assignedTo.filter((c: string) => clientList.includes(c))
          : []); // nobody preselected: each client is picked on purpose
    setSelectedClientsToAssign(clients);

    const initialFreqs: Record<string, { frequency: string; timeOfDay: string }> = {};
    clientList.forEach((cName) => {
      const existing = act.clientAssignments?.find((ca) => ca.clientName === cName);
      initialFreqs[cName] = {
        frequency: existing?.frequency || act.frequency || "Daily",
        timeOfDay: existing?.timeOfDay || act.timeOfDay || "Morning (8:00 AM)",
      };
    });
    setClientFrequencies(initialFreqs);
  };

  const toggleClientSelection = (clientName: string) => {
    setSelectedClientsToAssign((prev) =>
      prev.includes(clientName)
        ? prev.filter((c) => c !== clientName)
        : [...prev, clientName]
    );
  };

  const toggleSelectAllClients = () => {
    if (selectedClientsToAssign.length === clientList.length) {
      setSelectedClientsToAssign([]);
    } else {
      setSelectedClientsToAssign([...clientList]);
    }
  };

  const updateClientFrequency = (clientName: string, frequency: string) => {
    setClientFrequencies((prev) => ({
      ...prev,
      [clientName]: {
        ...(prev[clientName] || { timeOfDay: "Morning (8:00 AM)" }),
        frequency,
      },
    }));
  };

  const updateClientTimeOfDay = (clientName: string, timeOfDay: string) => {
    setClientFrequencies((prev) => ({
      ...prev,
      [clientName]: {
        ...(prev[clientName] || { frequency: "Daily" }),
        timeOfDay,
      },
    }));
  };

  const applyFrequencyToAll = (frequency: string) => {
    setClientFrequencies((prev) => {
      const next = { ...prev };
      selectedClientsToAssign.forEach((cName) => {
        next[cName] = {
          ...(next[cName] || { timeOfDay: "Morning (8:00 AM)" }),
          frequency,
        };
      });
      return next;
    });
  };

  const handleConfirmAssign = async () => {
    if (!assignModalActivity) return;

    const clientsPayload = selectedClientsToAssign.map((cName) => {
      const matched = clientObjects.find((c) => c.name === cName);
      return {
        clientId: matched?.id || '',
        clientName: cName,
        clientEmail: matched?.email || '',
        frequency: clientFrequencies[cName]?.frequency || "Daily",
        timeOfDay: clientFrequencies[cName]?.timeOfDay || "Morning (8:00 AM)",
      };
    });

    // One ActivityAssignment per client; the shared template itself is never changed
    let result: any = null;
    try {
      const res = await fetch('/api/activities/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: assignModalActivity.id,
          consultantId: authUser?.id || '',
          consultantEmail: authUser?.email || '',
          consultantName: authUser?.name || '',
          clients: clientsPayload
        })
      });
      result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) throw new Error(result?.error || `HTTP ${res.status}`);
    } catch (err: any) {
      console.error('Failed to post activity assignment:', err);
      toast({
        title: "Could not assign activity",
        description: err?.message === 'Activity template not found'
          ? `"${assignModalActivity.title}" is not in the activity library yet. Ask the admin to add it.`
          : "The assignment was not saved. Please try again.",
        variant: "destructive"
      });
      return;
    }

    await loadMyAssignments();
    window.dispatchEvent(new CustomEvent('client_data_updated'));
    window.dispatchEvent(new CustomEvent('notification_created'));

    const assignedCount = Number(result?.assignedCount || 0);
    const skippedCount = Array.isArray(result?.skipped) ? result.skipped.length : 0;
    toast({
      title: assignedCount ? "Activity Assigned & Clients Notified!" : "Already assigned",
      description: `"${assignModalActivity.title}" assigned to ${assignedCount} client(s)${skippedCount ? `; ${skippedCount} already had it pending` : ''}.`,
    });

    setAssignModalActivity(null);
    setAssignStep(1);
  };

  const openEditModal = (act: ActivityItem) => {
    setEditModalActivity(act);
    setEditTitle(act.title);
    setEditCategory(act.category);
    setEditDifficulty(act.difficulty);
    setEditDuration(act.duration);
    setEditDueDate(act.dueDate);
    setEditDescription(act.description);
    setEditInstructions(act.instructions || "");
  };

  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalActivity || isSavingEdit) return;

    const title = editTitle.trim();
    if (!title) {
      toast({ title: "Title is required", description: "Give the activity a name before saving.", variant: "destructive" });
      return;
    }

    const changes = {
      title,
      name: title,
      category: editCategory,
      categoryTag: editCategory,
      difficulty: editDifficulty,
      duration: editDuration.trim(),
      dueDate: editDueDate.trim(),
      description: editDescription.trim(),
      instructions: editInstructions.trim(),
    };

    // Saved to the library first; the card changes only after the server confirms
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/activities/${encodeURIComponent(String(editModalActivity.id))}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) throw new Error(data?.error || data?.message || `The server answered ${res.status}`);

      setActivities((prev) =>
        prev.map((item) =>
          item.id === editModalActivity.id
            ? {
                ...item,
                title,
                category: editCategory,
                difficulty: editDifficulty,
                duration: changes.duration,
                dueDate: changes.dueDate,
                description: changes.description,
                instructions: changes.instructions,
              }
            : item
        )
      );
      toast({ title: "Activity saved", description: `"${title}" was updated.` });
      setEditModalActivity(null);
    } catch (err: any) {
      toast({
        title: "Couldn't save the activity",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };



  const filteredActivities = activitiesWithAssignments.filter((act) => {
    const matchesCategory =
      selectedCategory === "All"
        ? true
        : act.category === selectedCategory;

    const matchesSearch =
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.assignedTo && act.assignedTo.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())));

    return matchesCategory && matchesSearch;
  });



  return (
    <div className="space-y-8 pb-16">
      {!activeActivity && (
      <>
      <PageHeader
        title="Activities Library"
        description="Browse, assign, and manage therapeutic exercises and worksheets with custom frequency schedules for your clients."
        badge="ACTIVITY MANAGEMENT"
        icon={<Activity className="w-4 h-4 text-purple-200" />}
      />

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
                  ? "bg-[#450bc8] text-white shadow-md shadow-purple-500/20 rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                  : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-full px-5 py-2 text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
              }
            >
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      {/* Activities Cards Grid */}
      {filteredActivities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredActivities.map((act) => {
            return (
              <div
                key={act.id}
                className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                {/* Top Image Container */}
                <div className="relative h-52 w-full overflow-hidden bg-slate-100">
                  <img
                    src={act.imageUrl}
                    alt={act.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>

                  {/* Category Tag (Top Left) */}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider text-slate-900 flex items-center gap-1.5 shadow-sm border border-white/40">
                    <span>{act.category}</span>
                  </div>

                  {/* Top Right Controls: 3-Dot Menu */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">

                    {/* 3-Dot Options Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Activity Options"
                          className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md hover:bg-white text-slate-700 flex items-center justify-center shadow-md border border-white/40 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2 shadow-xl border-slate-200">
                        {/* Direct Option to Assign Activity to Client */}
                        <DropdownMenuItem
                          onClick={() => openAssignModal(act)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm font-bold rounded-xl cursor-pointer text-[#450bc8] bg-purple-50/50 hover:bg-purple-100/70 mb-1"
                        >
                          <UserPlus className="w-4 h-4 text-[#450bc8]" />
                          <span>Assign to Clients & Set Frequency</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-1" />

                        {/* List of direct client options for quick frequency assign */}
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Quick Assign to Client:
                        </div>
                        {clientList.length > 0 ? (
                          clientList.slice(0, 4).map((clientName) => (
                            <DropdownMenuItem
                              key={clientName}
                              onClick={() => openAssignModal(act, clientName)}
                              className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer text-slate-700 hover:bg-slate-50"
                            >
                              <span>{clientName}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <div className="px-3 py-1.5 text-xs text-slate-400 italic">
                            No clients assigned
                          </div>
                        )}

                        <DropdownMenuSeparator className="my-1" />

                        <DropdownMenuItem
                          onClick={() => handlePreviewActivity(act)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold rounded-xl cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                          <span>Preview Exercise</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => openEditModal(act)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold rounded-xl cursor-pointer"
                        >
                          <Pencil className="w-4 h-4 text-slate-600" />
                          <span>Edit Activity</span>
                        </DropdownMenuItem>



                        <DropdownMenuSeparator className="my-1" />

                        <DropdownMenuItem
                          onClick={() => handleDelete(act)}
                          disabled={deletingId !== null}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                          <span>{deletingId === act.id ? "Deleting…" : "Delete"}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#450bc8] transition-colors leading-snug mb-2">
                      {act.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-3">
                      {act.description}
                    </p>

                    {/* Who this therapist has assigned it to */}
                    {act.assignedTo && act.assignedTo.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-500">Assigned to:</span>
                        {act.assignedTo.slice(0, 3).map((name) => (
                          <span key={name} className="px-2 py-0.5 rounded-full bg-purple-50 text-[#450bc8] text-[11px] font-bold">
                            {name}
                          </span>
                        ))}
                        {act.assignedTo.length > 3 && (
                          <span className="text-[11px] font-semibold text-slate-500">+{act.assignedTo.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Meta info & Action */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{act.duration}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Repeat className="w-4 h-4 text-slate-400" />
                        <span>{act.frequency || "Daily"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => openAssignModal(act)}
                        className="flex-1 h-11 rounded-2xl bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-bold text-sm transition-all duration-200 cursor-pointer shadow-md shadow-purple-500/20 gap-2"
                      >
                        <UserPlus className="w-4 h-4 stroke-[2.2]" />
                        <span>Assign to Client</span>
                      </Button>
                      <Button
                        onClick={() => handlePreviewActivity(act)}
                        variant="outline"
                        className="h-11 px-3.5 rounded-2xl border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm cursor-pointer"
                        title="Preview Exercise Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <p className="text-slate-500 font-medium text-sm">No activities found matching your criteria.</p>
        </div>
      )}
      </>
      )}

      {/* Activity opened: the same full-page player as the client panel (Back, centred title, player), plus the
          therapist's own action, Assign to Client, where the client panel has an empty spacer */}
      {activeActivity && (
        <div id="activity-page-container" className="space-y-2 pb-2 w-full max-w-5xl mx-auto animate-in fade-in duration-300">
          <div className="flex items-center justify-between gap-3 py-0.5">
            <Button
              variant="outline"
              onClick={() => setActiveActivity(null)}
              className="w-fit rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs h-10 sm:h-8 px-3 gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>

            <div className="flex-1 text-center min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                {activeActivity.title}
              </h1>
            </div>

            <Button
              type="button"
              onClick={() => openAssignModal(activeActivity)}
              className="rounded-xl bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-bold text-xs h-10 sm:h-8 min-w-10 px-3 gap-1.5 cursor-pointer shadow-xs shrink-0"
              title="Assign to Client & Set Frequency"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Assign to Client</span>
            </Button>
          </div>

          <div className="w-full">
            <ActivityGamePlayer activity={activeActivity} />
          </div>
        </div>
      )}

      {/* PER-CLIENT FREQUENCY ASSIGNMENT MODAL */}
      <Dialog open={!!assignModalActivity} onOpenChange={() => { setAssignModalActivity(null); setAssignStep(1); }}>
        {assignModalActivity && (
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg p-4 sm:p-7 rounded-3xl bg-white border-none shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Header with Step indicator */}
            <DialogHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2 pr-6 sm:pr-0">
                <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {assignStep === 1 ? "1. Select Client(s)" : "2. Select Activity Frequency"}
                </DialogTitle>
                <span className="text-xs font-bold text-[#450bc8] bg-purple-50 px-3 py-1 rounded-full border border-purple-100 shrink-0">
                  Step {assignStep} of 2
                </span>
              </div>
              <DialogDescription className="text-slate-500 text-sm font-medium">
                {assignStep === 1
                  ? `Choose which client(s) will receive "${assignModalActivity.title}".`
                  : `Configure individual practice frequencies for each assigned client.`}
              </DialogDescription>
            </DialogHeader>

            {/* STEP 1: Select Client(s) */}
            {assignStep === 1 && (
              <div className="space-y-4 my-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    My Assigned Clients ({selectedClientsToAssign.length} of {clientList.length} selected)
                  </span>
                  {clientList.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAllClients}
                      className="text-xs font-bold text-[#450bc8] hover:underline cursor-pointer"
                    >
                      {selectedClientsToAssign.length === clientList.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {isLoadingClients ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-medium">
                      Loading your assigned clients...
                    </div>
                  ) : clientList.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <p className="font-bold text-slate-700">No assigned clients found</p>
                      <p className="text-slate-400">Only clients assigned to you under your consultant profile will appear here.</p>
                    </div>
                  ) : (
                    clientList.map((client) => {
                      const isChecked = selectedClientsToAssign.includes(client);
                      return (
                        <div
                          key={client}
                          onClick={() => toggleClientSelection(client)}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? "bg-purple-50/80 border-[#450bc8]/40 text-[#450bc8] font-semibold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                                isChecked
                                  ? "bg-[#450bc8] border-[#450bc8] text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className="text-sm font-semibold">{client}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">Assigned Client</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Configure Per-Client Frequency & Schedule */}
            {assignStep === 2 && (
              <div className="space-y-4 my-2">
                {/* Bulk Shortcut Bar */}
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Quick Bulk Apply:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {["Daily", "2-3 Times / Week", "Weekly", "As Needed"].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => applyFrequencyToAll(f)}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white hover:bg-purple-50 text-slate-700 hover:text-[#450bc8] border border-slate-200 hover:border-[#450bc8]/30 transition-colors cursor-pointer"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Per-Client Frequency Configuration List */}
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {selectedClientsToAssign.map((clientName) => {
                    const currentConfig = clientFrequencies[clientName] || {
                      frequency: "Daily",
                      timeOfDay: "Morning (8:00 AM)",
                    };
                    const initials = clientName
                      .split(" ")
                      .map((n) => n[0])
                      .join("");

                    return (
                      <div
                        key={clientName}
                        className="p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:border-purple-200 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-[#450bc8] font-bold flex items-center justify-center text-xs shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 leading-tight">{clientName}</p>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Individual Schedule</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-[#450bc8] border border-purple-100">
                            {currentConfig.frequency}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Frequency
                            </label>
                            <select
                              value={currentConfig.frequency}
                              onChange={(e) => updateClientFrequency(clientName, e.target.value)}
                              className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#450bc8] focus:outline-none"
                            >
                              {FREQUENCY_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Preferred Time
                            </label>
                            <select
                              value={currentConfig.timeOfDay}
                              onChange={(e) => updateClientTimeOfDay(clientName, e.target.value)}
                              className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#450bc8] focus:outline-none"
                            >
                              {TIME_SLOTS.map((slot) => (
                                <option key={slot} value={slot}>
                                  {slot}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Footer Navigation */}
            <DialogFooter className="pt-3 border-t border-slate-100 gap-2 flex flex-row items-center justify-between">
              {assignStep === 2 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignStep(1)}
                  className="rounded-2xl border-slate-200 font-semibold h-11 gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Clients</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignModalActivity(null)}
                  className="rounded-2xl border-slate-200 font-semibold h-11"
                >
                  Cancel
                </Button>
              )}

              {assignStep === 1 ? (
                <Button
                  type="button"
                  onClick={() => setAssignStep(2)}
                  disabled={selectedClientsToAssign.length === 0}
                  className="rounded-2xl bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-bold h-11 px-6 shadow-md shadow-purple-500/20 cursor-pointer disabled:opacity-50 gap-1.5"
                >
                  <span>Select Frequency</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleConfirmAssign}
                  className="rounded-2xl bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-bold h-11 px-6 shadow-md shadow-purple-500/20 cursor-pointer gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirm Assignment</span>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Edit Activity Modal */}
      <Dialog open={!!editModalActivity} onOpenChange={() => setEditModalActivity(null)}>
        {editModalActivity && (
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg p-4 sm:p-7 rounded-3xl bg-white border-none shadow-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Edit Activity
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-sm font-medium">
                Update activity title, category, difficulty, duration or instructions. Changes are saved to the shared activity library.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Title *
                </label>
                <Input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="rounded-2xl border-slate-200 h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#450bc8]"
                  >
                    <option value="MINDFULNESS">MINDFULNESS</option>
                    <option value="CBT">CBT</option>
                    <option value="GRATITUDE">GRATITUDE</option>
                    <option value="BREATHING">BREATHING</option>
                    <option value="SOMATIC">SOMATIC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#450bc8]"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Duration
                  </label>
                  <Input
                    type="text"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="rounded-2xl border-slate-200 h-11"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Due Date
                  </label>
                  <Input
                    type="text"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="rounded-2xl border-slate-200 h-11"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#450bc8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Instructions
                </label>
                <textarea
                  rows={3}
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#450bc8]"
                />
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditModalActivity(null)}
                  className="rounded-2xl border-slate-200 font-semibold h-11"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingEdit || !editTitle.trim()}
                  className="rounded-2xl bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-bold h-11 px-6 shadow-md shadow-purple-500/20 cursor-pointer"
                >
                  {isSavingEdit ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
