import { useState, useEffect } from "react";
import { useGetClients } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  Filter,
  Calendar,
  Users,
  Mail,
  Phone,
  UserCheck,
  X,
  Brain,
  Award,
  Activity,
  FileText,
  Sparkles,
  Copy,
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  Upload,
  Send,
  CheckCircle2,
  Clock,
  Trash2,
  LineChart,
  ClipboardCheck,
  Layers,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAuthUser } from "@/lib/auth";

export default function Clients() {
  const { toast } = useToast();
  const authUser = getAuthUser();
  const [location, setLocation] = useLocation();

  const getTabFromUrl = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "outcomes" || tab === "assessments" || tab === "directory") {
        return tab;
      }
    }
    return "directory";
  };

  const [mainTab, setMainTab] = useState<string>(getTabFromUrl);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRecordClient, setSelectedRecordClient] = useState<any | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"intake" | "assessments" | "mood" | "sessions" | "documents">("intake");

  useEffect(() => {
    const tabFromUrl = getTabFromUrl();
    if (tabFromUrl !== mainTab) {
      setMainTab(tabFromUrl);
    }
  }, [location]);

  const [copiedSummary, setCopiedSummary] = useState(false);
  const [expandedScale, setExpandedScale] = useState<string | null>(null);
  const [newGoalInput, setNewGoalInput] = useState("");
  const [clientGoals, setClientGoals] = useState([
    { id: 1, text: "Reduce panic episode frequency from 3x/week to 0", completed: true },
    { id: 2, text: "Master box breathing and cognitive restructuring techniques", completed: true },
    { id: 3, text: "Maintain consistent 7+ hours of restful sleep daily", completed: false },
    { id: 4, text: "Complete weekly CBT thought record entries before sessions", completed: false },
  ]);

  const [homeworkList, setHomeworkList] = useState([
    { id: 101, title: "CBT Thought Record Log", frequency: "Daily", status: "completed", dueDate: "2026-07-27" },
    { id: 102, title: "Progressive Muscle Relaxation", frequency: "2x/day", status: "pending", dueDate: "2026-08-01" },
  ]);

  const handleCopySummary = () => {
    const text = "Client presents with persistent generalized anxiety, work-related burnout, and mild insomnia over the past 6 months. Seeking CBT coping strategies and sleep hygiene guidance.";
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    toast({
      title: "AI Summary Copied",
      description: "Intake summary copied to your clipboard.",
    });
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleAddGoal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newGoalInput.trim()) return;
    const text = newGoalInput.trim();
    setClientGoals((prev) => [
      ...prev,
      { id: Date.now(), text, completed: false },
    ]);
    setNewGoalInput("");
    toast({
      title: "Goal Added",
      description: `Goal "${text}" added to client plan.`,
    });
  };

  const deleteGoal = (id: number) => {
    setClientGoals((prev) => prev.filter((g) => g.id !== id));
    toast({
      title: "Goal Removed",
      description: "Therapeutic goal removed from client plan.",
    });
  };

  const toggleGoal = (id: number) => {
    setClientGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
  };

  const toggleHomework = (id: number) => {
    setHomeworkList((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, status: h.status === "completed" ? "pending" : "completed" } : h
      )
    );
  };

  const [dbClients, setDbClients] = useState<any[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(true);

  const fetchRealClientsFromDb = async () => {
    try {
      setIsDbLoading(true);
      const myName = authUser?.name || '';
      const myId = authUser?.id || '';
      if (!myId) {
        setDbClients([]);
        return;
      }

      // The server filters both lists to this therapist (by id, never by name)
      const [usersRes, bookingsRes] = await Promise.all([
        fetch(`/api/users?therapistId=${encodeURIComponent(myId)}`).then(r => r.ok ? r.json() : { users: [] }).catch(() => ({ users: [] })),
        fetch(`/api/bookings?consultantId=${encodeURIComponent(myId)}`).then(r => r.ok ? r.json() : { bookings: [] }).catch(() => ({ bookings: [] }))
      ]);

      const rawUsers = Array.isArray(usersRes?.users) ? usersRes.users : [];
      const rawBookings = Array.isArray(bookingsRes?.bookings) ? bookingsRes.bookings : [];
      const now = Date.now();
      const sessionTime = (b: any) => {
        const t = b.scheduledAt ? new Date(b.scheduledAt).getTime() : NaN;
        return Number.isFinite(t) ? t : null;
      };
      const status = (b: any) => String(b.status || '').toUpperCase();

      const formatted = rawUsers.map((u: any) => {
        // Bookings store the client's Mongo _id (older ones the custom id); consultant queries carry no client email
        const userIds = [u._id, u.id].filter(Boolean).map(String);
        const userBookings = rawBookings.filter((b: any) =>
          userIds.includes(String(b.clientId || '')) || userIds.includes(String(b.userId || ''))
        );

        // Last = most recent session already past (not cancelled); next = soonest upcoming that is still on
        const past = userBookings
          .filter((b: any) => { const t = sessionTime(b); return t !== null && t < now && !['CANCELLED', 'EXPIRED', 'PENDING_PAYMENT'].includes(status(b)); })
          .sort((a: any, b: any) => (sessionTime(b) as number) - (sessionTime(a) as number));
        const upcoming = userBookings
          .filter((b: any) => { const t = sessionTime(b); return t !== null && t >= now && ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(status(b)); })
          .sort((a: any, b: any) => (sessionTime(a) as number) - (sessionTime(b) as number));
        const last = past[0];
        const next = upcoming[0];

        return {
          id: String(u._id || u.id),
          // The stored client number (e.g. CL-00007); nothing when the client has none yet
          code: u.clientNumber ? String(u.clientNumber) : '',
          name: u.name || 'Client User',
          // Contact details are only sent for the therapist's own clients; never invent placeholders
          email: u.email || '',
          phone: u.phoneNumber || u.phone || '',
          therapist: u.assignedTherapistName || myName,
          modality: (next || last)?.serviceTitle || 'Individual Therapy',
          lastSession: last ? (last.date || new Date(sessionTime(last) as number).toISOString().split('T')[0]) : '',
          lastSessionAt: last ? sessionTime(last) : null,
          nextSession: next ? (next.date || new Date(sessionTime(next) as number).toISOString().split('T')[0]) : '',
          nextSessionTime: next?.time || '',
          status: (u.status ? String(u.status).toLowerCase() : ((u.emailVerified || userBookings.length) ? 'active' : 'new')),
          primaryGoal: u.primaryGoal || u.therapyGoals?.[0] || '',
          avatar: u.image || u.avatarUrl || undefined,
          createdAt: u.createdAt
        };
      });

      setDbClients(formatted);
    } catch (err) {
      console.error('Error fetching clients from MongoDB:', err);
    } finally {
      setIsDbLoading(false);
    }
  };

  useEffect(() => {
    fetchRealClientsFromDb();

    const handleRefresh = () => fetchRealClientsFromDb();
    window.addEventListener('client_created', handleRefresh);
    return () => {
      window.removeEventListener('client_created', handleRefresh);
    };
  }, [authUser?.name, authUser?.id]);

  const clientList = dbClients;
  const isLoading = isDbLoading;

  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<"recent" | "name" | "status">("recent");

  const filteredClients = clientList.filter((c: any) => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || 
      (c.name && c.name.toLowerCase().includes(q)) || 
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.therapist && c.therapist.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "all" || (c.status && c.status.toLowerCase() === statusFilter.toLowerCase());
    return matchesSearch && matchesStatus;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "status") return (a.status || "").localeCompare(b.status || "");
    return new Date(b.createdAt || b.lastSessionAt || 0).getTime() - new Date(a.createdAt || a.lastSessionAt || 0).getTime();
  });

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all";

  const totalPages = rowsPerPage === 0 ? 1 : Math.max(1, Math.ceil(sortedClients.length / rowsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedClients = rowsPerPage === 0 
    ? sortedClients 
    : sortedClients.slice((validCurrentPage - 1) * rowsPerPage, validCurrentPage * rowsPerPage);

  const startRow = sortedClients.length === 0 ? 0 : (validCurrentPage - 1) * (rowsPerPage || sortedClients.length) + 1;
  const endRow = rowsPerPage === 0 ? sortedClients.length : Math.min(validCurrentPage * rowsPerPage, sortedClients.length);

  const activeCount = clientList.filter((c: any) => c.status === "active" || c.status === "new").length;

  // Up to five page buttons around the current page (never past either end)
  const pageWindowStart = Math.max(1, Math.min(validCurrentPage - 2, totalPages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => pageWindowStart + i);

  // Shared by the mobile cards and the desktop table so paging works on every screen size
  const renderPagination = (className: string) => (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-600", className)}>
      <div>
        Showing <span className="font-extrabold text-slate-900">{startRow}</span> to <span className="font-extrabold text-slate-900">{endRow}</span> of <span className="font-extrabold text-[#450bc8]">{sortedClients.length}</span> client records
      </div>

      {rowsPerPage !== 0 && totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={validCurrentPage <= 1}
            onClick={() => setCurrentPage(Math.max(1, validCurrentPage - 1))}
            className="h-8 px-3 rounded-xl border-slate-200 text-xs font-bold"
          >
            Previous
          </Button>

          <div className="flex items-center gap-1 px-1">
            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={cn(
                  "w-8 h-8 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center",
                  validCurrentPage === pageNum
                    ? "bg-[#450bc8] text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={validCurrentPage >= totalPages}
            onClick={() => setCurrentPage(Math.min(totalPages, validCurrentPage + 1))}
            className="h-8 px-3 rounded-xl border-slate-200 text-xs font-bold"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === 'new') {
      return <span className="text-xs px-3 py-1 font-bold rounded-full inline-block bg-blue-100 text-blue-700">New</span>;
    }
    if (s === 'completed') {
      return <span className="text-xs px-3 py-1 font-bold rounded-full inline-block bg-slate-100 text-slate-700">Completed</span>;
    }
    if (s === 'inactive') {
      return <span className="text-xs px-3 py-1 font-bold rounded-full inline-block bg-rose-100 text-rose-700">Inactive</span>;
    }
    return <span className="text-xs px-3 py-1 font-bold rounded-full inline-block bg-emerald-100 text-emerald-700">Active</span>;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* TOP HEADER PURPLE BANNER MATCHING HEXPERTIFY SYSTEM COLOR THEME */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#431bb5] via-[#450bc8] to-[#361394] p-6 sm:p-8 text-white shadow-lg shadow-purple-900/10 border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Decorative ambient background glows */}
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-400/15 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Client Records
          </h1>
          <p className="text-xs sm:text-sm text-purple-100/90 max-w-2xl font-medium leading-relaxed">
            Access complete client details, AI intake surveys, assessment scores and session notes.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 bg-white/15 backdrop-blur-md p-4 px-6 rounded-2xl border border-white/20 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-purple-200 block uppercase tracking-wider">My Client Records</span>
            <span className="text-xl font-extrabold text-white">{activeCount} Active {activeCount === 1 ? 'Record' : 'Records'}</span>
          </div>
        </div>
      </div>

      {/* FILTER, SEARCH & ROW CONTROL BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by client name, ID, or therapist..." 
              className="pl-11 h-11 bg-slate-50 border-slate-200 rounded-2xl text-xs font-medium focus:bg-white"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full">
            {/* Status Filter Buttons */}
            {/* Scrolls sideways inside itself on narrow screens instead of widening the page */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl min-w-0 max-w-full overflow-x-auto">
              {[
                { id: "all", label: "All" },
                { id: "active", label: "Active" },
                { id: "new", label: "New" },
                { id: "completed", label: "Completed" },
                { id: "inactive", label: "Inactive" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(item.id);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all cursor-pointer whitespace-nowrap",
                    statusFilter === item.id 
                      ? "bg-[#450bc8] text-white shadow-sm" 
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Row Per Page Filter */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Show:</span>
              <Select 
                value={String(rowsPerPage)} 
                onValueChange={(val) => {
                  setRowsPerPage(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-28 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                  <SelectValue placeholder="10 rows" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="5" className="text-xs font-semibold">5 rows</SelectItem>
                  <SelectItem value="10" className="text-xs font-semibold">10 rows</SelectItem>
                  <SelectItem value="25" className="text-xs font-semibold">25 rows</SelectItem>
                  <SelectItem value="50" className="text-xs font-semibold">50 rows</SelectItem>
                  <SelectItem value="100" className="text-xs font-semibold">100 rows</SelectItem>
                  <SelectItem value="0" className="text-xs font-semibold">All rows</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* CLIENT ROSTER TABLE */}
      {isLoading ? (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : sortedClients.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200 space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-purple-50 text-[#450bc8] rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-extrabold text-slate-900">
              {hasActiveFilters ? "No clients match this filter" : "No Clients Assigned Yet"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {hasActiveFilters
                ? "Try adjusting your search query or status filter." 
                : `There are currently no clients booked or assigned to ${authUser?.name || 'your consultant profile'}. When a client books a session through the platform or an administrator assigns a client, their profile will appear here.`
              }
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Card List View (Visible on mobile viewports < 768px) */}
          <div className="space-y-3.5 md:hidden">
            {paginatedClients.map((clientItem: any) => (
              <div key={clientItem.id} className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-tight">{clientItem.name}</h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {clientItem.code ? <span className="font-mono">{clientItem.code} · </span> : null}
                      {clientItem.modality || 'Individual Therapy'}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(clientItem.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Session</span>
                    <span className="font-mono font-semibold text-slate-700 text-xs mt-0.5 block">{clientItem.lastSession || '—'}</span>
                  </div>

                  <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[10px] font-bold text-[#450bc8] uppercase tracking-wider block">Next Session</span>
                    {clientItem.nextSession ? (
                      <span className="font-mono font-extrabold text-[#450bc8] text-xs mt-0.5 block">
                        {clientItem.nextSession} <span className="text-[10px] font-normal text-slate-500">{clientItem.nextSessionTime}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal text-xs block">—</span>
                    )}
                  </div>
                </div>

                <div className="pt-1">
                  <Link href={`/clients/${clientItem.id}`} className="block w-full">
                    <Button className="w-full bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-extrabold text-xs h-10 rounded-xl shadow-sm cursor-pointer">
                      View Full Record
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {renderPagination("p-4 bg-white rounded-2xl border border-slate-200 shadow-xs")}
          </div>

          {/* Desktop Table View (Visible on desktop viewports >= 768px) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    <th className="py-4 px-6">Client Name</th>
                    <th className="py-4 px-6">Service Modality</th>
                    <th className="py-4 px-6">Last Session</th>
                    <th className="py-4 px-6">Next Session</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedClients.map((clientItem: any) => (
                    <tr key={clientItem.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {clientItem.name}
                        </div>
                        {clientItem.code && (
                          <div className="text-[11px] font-mono font-medium text-slate-400 mt-0.5">{clientItem.code}</div>
                        )}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-600 whitespace-nowrap">
                        {clientItem.modality || 'Individual Therapy'}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-500 font-mono whitespace-nowrap">
                        {clientItem.lastSession || '—'}
                      </td>
                      <td className="py-4 px-6 font-bold text-[#450bc8] font-mono whitespace-nowrap">
                        {clientItem.nextSession ? (
                          <div>
                            <span className="block">{clientItem.nextSession}</span>
                            {clientItem.nextSessionTime && (
                              <span className="block text-[11px] font-normal text-slate-500">{clientItem.nextSessionTime}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {getStatusBadge(clientItem.status)}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <Link href={`/clients/${clientItem.id}`}>
                          <Button className="bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap">
                            View Full Record
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MODERN TABLE PAGINATION & ROW FILTER FOOTER */}
            {renderPagination("p-4 sm:px-6 bg-slate-50/80 border-t border-slate-100")}
          </div>
        </>
      )}

      <Dialog open={!!selectedRecordClient} onOpenChange={() => setSelectedRecordClient(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-y-auto rounded-3xl border-0 shadow-2xl">
          {selectedRecordClient && (
            <div className="p-4 sm:p-6 space-y-6">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-[#450bc8] text-white font-black text-lg flex items-center justify-center shadow-lg shadow-[#450bc8]/20">
                    {selectedRecordClient.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 break-words">{selectedRecordClient.name}</h2>
                      {getStatusBadge(selectedRecordClient.status)}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {[selectedRecordClient.code, selectedRecordClient.modality, selectedRecordClient.therapist].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecordClient(null)}
                  className="w-10 h-10 sm:w-8 sm:h-8 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 hide-scrollbar text-xs">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("intake")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer",
                    activeModalTab === "intake" ? "bg-[#450bc8] text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  <Brain className="w-4 h-4" /> Intake
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("assessments")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer",
                    activeModalTab === "assessments" ? "bg-[#450bc8] text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  <Award className="w-4 h-4" /> Assessments
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("mood")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer",
                    activeModalTab === "mood" ? "bg-[#450bc8] text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  <Activity className="w-4 h-4" /> Goals
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("sessions")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer",
                    activeModalTab === "sessions" ? "bg-[#450bc8] text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  <Calendar className="w-4 h-4" /> Sessions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("documents")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer",
                    activeModalTab === "documents" ? "bg-[#450bc8] text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  <FileText className="w-4 h-4" /> Docs
                </button>
              </div>

              {activeModalTab === "intake" && (
                <div className="p-4 bg-purple-50 rounded-2xl text-xs text-purple-900">
                  <h4 className="font-extrabold uppercase mb-2">AI Summary</h4>
                  <p>Client presents with persistent generalized anxiety, work-related burnout, and mild insomnia over the past 6 months. Seeking CBT coping strategies and sleep hygiene guidance.</p>
                </div>
              )}

              {activeModalTab === "mood" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Active Therapeutic Goals</h4>
                      <span className="text-xs font-bold text-slate-500">
                        {clientGoals.filter((g) => g.completed).length} / {clientGoals.length} Completed
                      </span>
                    </div>

                    <div className="space-y-2">
                      {clientGoals.map((goal) => (
                        <div
                          key={goal.id}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={goal.completed}
                              onChange={() => toggleGoal(goal.id)}
                              className="w-4 h-4 accent-[#450bc8] rounded cursor-pointer"
                            />
                            <span className={cn("font-semibold text-slate-800", goal.completed && "line-through text-slate-400")}>
                              {goal.text}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteGoal(goal.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleAddGoal} className="flex gap-2 pt-2">
                      <Input
                        placeholder="Add new therapy goal..."
                        value={newGoalInput}
                        onChange={(e) => setNewGoalInput(e.target.value)}
                        className="text-xs rounded-xl h-9"
                      />
                      <button
                        type="submit"
                        className="bg-[#450bc8] text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-[#3a0aa8] transition-colors cursor-pointer shrink-0"
                      >
                        Add Goal
                      </button>
                    </form>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Recent Mood & Daily Check-ins</h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">8.5 / 10</span>
                          <span className="text-slate-700 font-medium">Completed thought record log with ease. Slept 7.5 hours.</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">Jul 27, 2026</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">6.0 / 10</span>
                          <span className="text-slate-700 font-medium">Slight anxiety regarding work presentation. Practiced breathing.</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">Jul 24, 2026</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SESSIONS & HOMEWORK */}
              {activeModalTab === "sessions" && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Session Timeline</h4>
                      <button
                        type="button"
                        onClick={() => toast({ title: "Session Booking", description: `Opened booking calendar for ${selectedRecordClient.name}.` })}
                        className="inline-flex items-center gap-1.5 bg-[#450bc8] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs hover:bg-[#3a0aa8] cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Schedule Session</span>
                      </button>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Session #12 · CBT Anxiety Protocol</span>
                        <span className="text-[11px] text-slate-500">Completed Jul 28, 2026 (50 min) · Notes logged</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">Completed</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Session #13 · Review &amp; Sleep Hygiene</span>
                        <span className="text-[11px] text-slate-500">Upcoming Aug 01, 2026 at 09:00 AM</span>
                      </div>
                      <span className="text-xs font-bold text-[#450bc8] bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">Scheduled</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Assigned Homework Tasks</h4>
                    <div className="space-y-2">
                      {homeworkList.map((hw) => (
                        <div
                          key={hw.id}
                          className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{hw.title}</span>
                            <span className="text-[11px] text-slate-500">Frequency: {hw.frequency} · Due: {hw.dueDate}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleHomework(hw.id)}
                            className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all",
                              hw.status === "completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            )}
                          >
                            {hw.status === "completed" ? "Completed" : "Mark Complete"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: DOCUMENTS & FILES */}
              {activeModalTab === "documents" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Workspace Documents</h4>
                    <label className="inline-flex items-center gap-1.5 bg-[#450bc8] text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs hover:bg-[#3a0aa8] cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Document</span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            toast({
                              title: "Document Uploaded",
                              description: `"${file.name}" uploaded to ${selectedRecordClient.name}'s file record.`,
                            });
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-red-500" />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">CBT_Thought_Record_Worksheet.pdf</span>
                          <span className="text-[11px] text-slate-400">PDF · 1.4 MB · Uploaded Jul 20, 2026</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toast({ title: "Downloading Worksheet", description: "CBT_Thought_Record_Worksheet.pdf downloaded." })}
                        className="text-xs font-bold text-[#450bc8] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">Initial_Intake_Assessment_Form.pdf</span>
                          <span className="text-[11px] text-slate-400">PDF · 2.1 MB · Uploaded Jun 15, 2026</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toast({ title: "Downloading Intake Form", description: "Initial_Intake_Assessment_Form.pdf downloaded." })}
                        className="text-xs font-bold text-[#450bc8] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-purple-500" />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">Sleep_Hygiene_Psychoeducation_Guide.pdf</span>
                          <span className="text-[11px] text-slate-400">PDF · 890 KB · Uploaded Jul 04, 2026</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toast({ title: "Downloading Psychoeducation Guide", description: "Sleep_Hygiene_Psychoeducation_Guide.pdf downloaded." })}
                        className="text-xs font-bold text-[#450bc8] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
