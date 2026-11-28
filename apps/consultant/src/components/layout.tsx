import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { logoutUser, getAuthUser } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  Calendar,
  LineChart,
  IndianRupee,
  Star,
  FolderOpen,
  ClipboardCheck,
  MessageSquare,
  PenTool,
  User,
  Settings,
  LogOut,
  Bell,
  Search,
  Plus,
  Activity,
  ChevronUp,
  Brain,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Minus,
  X,
  FileText,
  Menu,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { OutcomeRecord } from "@/lib/outcome-store";
import { useServerNotifications, formatNotificationTime, type ServerNotification } from "@/lib/notifications";
import { useGetDashboardStats } from "@workspace/api-client-react";

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Clients" | "Pages & Modules";
  href: string;
  badge?: string;
  keywords?: string[];
}

// The panel's pages; clients come from this therapist's own bookings (loadSearchClients)
const PAGE_SEARCH_ITEMS: SearchItem[] = [
  { id: "p1", title: "Dashboard", subtitle: "Overview, active clients & metrics", category: "Pages & Modules", href: "/", badge: "Module", keywords: ["home", "stats", "overview"] },
  { id: "p2", title: "Activities Library", subtitle: "Browse, assign & manage therapeutic exercises", category: "Pages & Modules", href: "/activities", badge: "Module", keywords: ["exercise", "homework", "mindfulness", "cbt"] },
  { id: "p3", title: "Client Directory", subtitle: "Full client list, intake forms & details", category: "Pages & Modules", href: "/clients", badge: "Module", keywords: ["patients", "records", "intake"] },
  { id: "p4", title: "Session Calendar", subtitle: "Schedule appointments & view timeline", category: "Pages & Modules", href: "/calendar", badge: "Module", keywords: ["booking", "schedule", "events"] },
  { id: "p5", title: "Client Messages", subtitle: "Secure direct messaging & chat logs", category: "Pages & Modules", href: "/messages", badge: "Module", keywords: ["chat", "inbox", "communication"] },
  { id: "p6", title: "Outcomes", subtitle: "Track PHQ-9 & GAD-7 assessment progress", category: "Pages & Modules", href: "/outcomes", badge: "Module", keywords: ["phq9", "gad7", "scores", "progress"] },
  { id: "p7", title: "Earnings & Analytics", subtitle: "Financial reports, payouts & session billing", category: "Pages & Modules", href: "/revenue", badge: "Module", keywords: ["invoices", "income", "payments"] },
  { id: "p8", title: "Reviews & Ratings", subtitle: "Patient feedback & satisfaction metrics", category: "Pages & Modules", href: "/reviews", badge: "Module", keywords: ["feedback", "ratings", "stars"] },
  { id: "p9", title: "Resources", subtitle: "Worksheets, psychoeducation & document files", category: "Pages & Modules", href: "/resources", badge: "Module", keywords: ["pdf", "files", "materials"] },
  { id: "p10", title: "Assessments", subtitle: "Evaluation questionnaires", category: "Pages & Modules", href: "/assessments", badge: "Module", keywords: ["tests", "evaluations", "forms"] },
  { id: "p11", title: "Blog & Psychoeducation", subtitle: "Articles & insights for clients", category: "Pages & Modules", href: "/blog", badge: "Content", keywords: ["articles", "posts", "education"] },
  { id: "p12", title: "Profile", subtitle: "Your therapist profile", category: "Pages & Modules", href: "/profile", badge: "Module", keywords: ["account", "settings", "photo"] },
];

/** One search entry per client this therapist has a booking with, linking to that client's page */
async function loadSearchClients(user: { id?: string; email?: string } | null): Promise<SearchItem[]> {
  const query = new URLSearchParams();
  if (user?.id) query.set("consultantId", String(user.id));
  if (user?.email) query.set("consultantEmail", String(user.email).toLowerCase());
  if (!query.toString()) return [];
  const res = await fetch(`/api/bookings?${query.toString()}`);
  if (!res.ok) throw new Error(`bookings ${res.status}`);
  const data = await res.json();
  const bookings: any[] = Array.isArray(data?.bookings) ? data.bookings : [];

  const byClient = new Map<string, { name: string; ref: string; sessions: number; last: string }>();
  for (const b of bookings) {
    const ref = String(b.clientId || b.clientEmail || "").trim();
    const name = String(b.clientName || "").trim();
    if (!ref || !name) continue;
    const key = ref.toLowerCase();
    const day = String(b.date || b.scheduledAt || "").slice(0, 10);
    const entry = byClient.get(key) || { name, ref, sessions: 0, last: "" };
    entry.sessions += 1;
    if (day > entry.last) entry.last = day;
    byClient.set(key, entry);
  }

  return Array.from(byClient.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({
      id: `client-${c.ref}`,
      title: c.name,
      subtitle: `${c.sessions} session${c.sessions === 1 ? "" : "s"}${c.last ? ` · latest ${c.last}` : ""}`,
      category: "Clients" as const,
      // The client page accepts the client's id or email
      href: `/clients/${c.ref}`,
      badge: "Client",
    }));
}

function initialsOf(name?: string): string {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** The therapist's own photo, or their initials when there is none (never a stock photo) */
function UserAvatar({ user, className }: { user: ReturnType<typeof getAuthUser>; className: string }) {
  const photo = user?.photoUrl || user?.image || user?.avatarUrl;
  if (photo) return <img src={photo} alt={user?.name || "Your photo"} className={cn(className, "object-cover")} />;
  return (
    <div className={cn(className, "bg-[#450bc8]/10 text-[#450bc8] font-bold text-xs flex items-center justify-center")}>
      {user?.avatarInitials || initialsOf(user?.name) || <User className="w-4 h-4" />}
    </div>
  );
}

const CONTENT_ITEMS = [
  { name: "Blog", href: "/blog", icon: PenTool },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const user = getAuthUser();

  const [liveStats, setLiveStats] = useState<{
    totalClientsCount: number;
    homeworkDueToday: number;
    sessionsToday: number;
    unreadMessagesCount: number;
    averageRating: number;
    totalReviews: number;
  }>({
    totalClientsCount: 0,
    homeworkDueToday: 0,
    sessionsToday: 0,
    unreadMessagesCount: 0,
    averageRating: 5.0,
    totalReviews: 0,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadLiveStats() {
      try {
        const myName = user?.name || '';
        const myId = user?.id || '';
        const res = await fetch(`/api/dashboard/stats?consultantId=${encodeURIComponent(myId)}&consultantName=${encodeURIComponent(myName)}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          const s = data.stats || data;
          setLiveStats({
            totalClientsCount: Number(s.totalClientsCount ?? s.activeClientsCount ?? 0),
            homeworkDueToday: Number(s.homeworkDueToday ?? s.totalActivitiesCount ?? 0),
            sessionsToday: Number(s.sessionsToday ?? s.upcomingSessionsCount ?? 0),
            unreadMessagesCount: Number(s.unreadMessagesCount ?? 0),
            averageRating: Number(s.averageRating ?? 5.0),
            totalReviews: Number(s.totalReviews ?? 0),
          });
        }
      } catch {}
    }

    loadLiveStats();
    const interval = setInterval(loadLiveStats, 8000);
    window.addEventListener("auth_state_change", loadLiveStats);
    window.addEventListener("focus", loadLiveStats);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("auth_state_change", loadLiveStats);
      window.removeEventListener("focus", loadLiveStats);
    };
  }, [user?.name, user?.id]);

  const workspaceItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { 
      name: "Activities", 
      href: "/activities", 
      icon: Activity, 
      badge: liveStats.homeworkDueToday > 0 ? `${liveStats.homeworkDueToday}` : undefined 
    },
    { 
      name: "Clients", 
      href: "/clients", 
      icon: Users, 
      badge: `${liveStats.totalClientsCount}` 
    },
    { 
      name: "Calendar", 
      href: "/calendar", 
      icon: Calendar, 
      badge: liveStats.sessionsToday > 0 ? `${liveStats.sessionsToday}` : undefined 
    },
    { 
      name: "Messages", 
      href: "/messages", 
      icon: MessageSquare, 
      // Unread client messages (from the server's message count), not outcome notifications
      badge: liveStats.unreadMessagesCount > 0 ? `${liveStats.unreadMessagesCount}` : undefined
    },
    { name: "Assessments", href: "/assessments", icon: ClipboardCheck },
    { name: "Earnings", href: "/revenue", icon: IndianRupee },
    { 
      name: "Reviews", 
      href: "/reviews", 
      icon: Star, 
      badge: liveStats.totalReviews > 0 ? `${liveStats.averageRating.toFixed(1)}` : undefined 
    },
    { name: "Resources", href: "/resources", icon: FolderOpen },
  ];

  const confirmSignOut = () => {
    setShowSignOutDialog(false);
    logoutUser();
    window.location.href = "/login?role=therapist";
  };

  const isItemActive = (href: string) => {
    if (href === "/") {
      return location === "/" || location === "/dashboard";
    }
    const cleanHref = href.split('?')[0];
    if (href.includes('?tab=')) {
      const tabName = href.split('?tab=')[1];
      return location === cleanHref && typeof window !== "undefined" && window.location.search.includes(`tab=${tabName}`);
    }
    return location === href || location.startsWith(href + '/');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#eef1f6]">
      {/* Brand Header */}
      <div className="h-20 md:h-24 short:h-16 px-4 flex items-center justify-between border-b border-[#f1f5f9] overflow-hidden shrink-0">
        <Link href="/" onClick={onCloseMobile} className="inline-flex items-center select-none cursor-pointer">
          <img
            src="/hexpertify-logo.png"
            alt="HEXPERTIFY ANYTIME,ANYWHERE"
            className="h-14 md:h-20 short:h-12 max-w-full w-auto object-contain transition-transform hover:scale-[1.02]"
          />
        </Link>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-6 short:py-3 space-y-6">
        {/* Workspace Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
            WORKSPACE
          </div>
          <nav className="space-y-1">
            {workspaceItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 group",
                    isActive
                      ? "bg-[#450bc8] text-white shadow-md shadow-[#450bc8]/25"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                      )}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-bold",
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Content Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
            CONTENT
          </div>
          <nav className="space-y-1">
            {CONTENT_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 group",
                    isActive
                      ? "bg-[#450bc8] text-white shadow-md shadow-[#450bc8]/25"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                      )}
                    />
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Admin Quick Profile Footer */}
      {/* Same as the admin panel: who is signed in, with a sign-out button on the right */}
      <div className="p-4 border-t border-[#f1f5f9] bg-slate-50/50 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onCloseMobile?.();
              setLocation("/profile");
            }}
            title="View profile"
            className="flex items-center gap-3 min-w-0 text-left cursor-pointer rounded-lg"
          >
            <div className="relative shrink-0">
              <UserAvatar user={user} className="w-9 h-9 rounded-full ring-2 ring-[#450bc8]/20" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "Your account"}</p>
              <p className="text-[11px] text-slate-500 font-medium truncate">{user?.email || user?.title || "Therapist"}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              onCloseMobile?.();
              setShowSignOutDialog(true);
            }}
            title="Sign Out"
            aria-label="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-30 w-64 bg-white border-r border-[#eef1f6] flex-col shadow-sm hidden lg:flex"
        style={{ boxShadow: '2px 0 16px rgba(0, 0, 0, 0.02)' }}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden animate-in fade-in-0"
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 w-72 bg-white flex-col shadow-2xl transition-transform duration-300 lg:hidden flex",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>

      {/* Sign Out Confirmation Modal */}
      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[380px] p-5 sm:p-7 rounded-[20px] sm:rounded-[24px] bg-white border-none shadow-2xl space-y-0 gap-0 outline-none [&>button]:hidden">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4 sm:mb-5">
            <LogOut className="w-5 h-5 text-red-500 stroke-[2.2]" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">
            Sign out
          </h2>
          <p className="text-slate-500 text-sm font-medium mb-6">
            Are you sure you want to sign out?
          </p>

          <div className="flex items-center gap-3 w-full pt-1">
            <button
              type="button"
              onClick={() => setShowSignOutDialog(false)}
              className="flex-1 h-11 rounded-2xl border border-slate-200 bg-white text-slate-900 font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmSignOut}
              className="flex-1 h-11 rounded-2xl bg-[#ef4444] hover:bg-red-600 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Header({ onOpenMobileSidebar }: { onOpenMobileSidebar?: () => void }) {
  const user = getAuthUser();
  const [, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeRecord | null>(null);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { notifications, unreadCount, markRead, markAllRead: markAllNotificationsRead, refresh: refreshNotifications, loadFailed: notificationsFailed } = useServerNotifications();

  // This therapist's clients for the search box, loaded the first time the search opens
  const [searchClients, setSearchClients] = useState<SearchItem[] | null>(null);
  const [searchClientsFailed, setSearchClientsFailed] = useState(false);
  useEffect(() => {
    if (!isSearchOpen || searchClients !== null) return;
    let active = true;
    loadSearchClients(user)
      .then((items) => {
        if (!active) return;
        setSearchClients(items);
        setSearchClientsFailed(false);
      })
      .catch(() => {
        if (!active) return;
        setSearchClients([]);
        setSearchClientsFailed(true);
      });
    return () => {
      active = false;
    };
  }, [isSearchOpen, searchClients]);

  const handleNotificationClick = (item: ServerNotification) => {
    markRead(item.id);
    setShowNotifications(false);
    // Links are panel paths such as /consultant/calendar; this app's routes drop the /consultant prefix
    const path = (item.link || "/consultant/calendar").replace(/^\/consultant(?=\/|$)/, "") || "/";
    setLocation(path);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchResultClick = (href: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setLocation(href);
  };

  const searchItems = [...(searchClients || []), ...PAGE_SEARCH_ITEMS];
  const filteredSearchResults = searchQuery.trim() === ""
    ? [...(searchClients || []).slice(0, 4), ...PAGE_SEARCH_ITEMS.slice(0, 4)]
    : searchItems.filter((item) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.category !== "Clients" && item.subtitle.toLowerCase().includes(q)) ||
          item.keywords?.some((k) => k.toLowerCase().includes(q))
        );
      });

  const categories = ["Clients", "Pages & Modules"] as const;

  // Shared by the desktop and mobile search boxes (each container shows it at its own screen size)
  const searchResultsDropdown = isSearchOpen && (
    <>
      {/* Click Outside Backdrop */}
      <div
        className="fixed inset-0 z-20"
        onClick={() => setIsSearchOpen(false)}
      />

      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-200/90 z-40 overflow-hidden animate-in fade-in-0 slide-in-from-top-2">
        <div className="p-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
            {searchQuery.trim() ? `Search Results (${filteredSearchResults.length})` : "Quick Suggestions"}
          </span>
          <span className="text-[10px] font-medium text-slate-400 px-2 hidden sm:inline">
            Press <kbd className="px-1 py-0.5 bg-white border rounded font-mono">ESC</kbd> to exit
          </span>
        </div>

        {searchClients === null && (
          <p className="px-5 pt-3 text-[11px] text-slate-400 font-medium">Loading your clients…</p>
        )}
        {searchClientsFailed && (
          <p className="px-5 pt-3 text-[11px] text-amber-700 font-medium">
            Couldn&apos;t load your clients, so only pages are shown.{" "}
            <button type="button" onClick={() => { setSearchClientsFailed(false); setSearchClients(null); }} className="font-bold text-[#450bc8] hover:underline cursor-pointer">
              Try again
            </button>
          </p>
        )}

        <div className="max-h-[60vh] sm:max-h-[min(420px,55vh)] overflow-y-auto p-2 space-y-3 divide-y divide-slate-100">
          {filteredSearchResults.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Search className="w-8 h-8 text-slate-300 mx-auto stroke-[1.5]" />
              <p className="text-sm font-bold text-slate-700">No results found for "{searchQuery}"</p>
              <p className="text-xs text-slate-400">Try a client&apos;s name or a page such as "Calendar".</p>
            </div>
          ) : (
            categories.map((cat) => {
              const catItems = filteredSearchResults.filter((item) => item.category === cat);
              if (catItems.length === 0) return null;

              return (
                <div key={cat} className="pt-2 first:pt-0">
                  <div className="px-3 py-1.5 text-[11px] font-extrabold text-[#450bc8] uppercase tracking-wider flex items-center justify-between">
                    <span>{cat}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{catItems.length}</span>
                  </div>

                  <div className="space-y-1 mt-1">
                    {catItems.map((item) => {
                      const ItemIcon = item.category === "Clients" ? Users : LayoutDashboard;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSearchResultClick(item.href)}
                          className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-purple-50/60 transition-all text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-[#450bc8] text-slate-500 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                              <ItemIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 group-hover:text-[#450bc8] transition-colors truncate">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-slate-500 font-medium truncate">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 group-hover:bg-purple-100 text-slate-600 group-hover:text-[#450bc8] transition-colors">
                              {item.badge}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#450bc8] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );

  return (
    <header className="sticky top-0 short:static z-20 bg-white/95 backdrop-blur-md border-b border-[#eef1f6] shadow-sm">
      <div className="h-16 md:h-24 px-3 sm:px-6 md:px-8 flex items-center justify-between gap-2">
        {/* Mobile Sidebar Toggle Button & Brand Logo */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {onOpenMobileSidebar && (
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors lg:hidden cursor-pointer shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Global Search Bar - Hidden on xs to prevent crowding */}
        <div className="flex-1 max-w-xl relative hidden sm:block">
          <div className="relative group z-30">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-[#450bc8] transition-colors" />
            <input 
              ref={searchInputRef}
              type="text" 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search clients and pages..."
              className="w-full bg-slate-100/70 hover:bg-slate-100 border border-slate-200/80 focus:bg-white focus:border-[#450bc8] focus:ring-2 focus:ring-[#450bc8]/10 rounded-full pl-10 pr-10 py-2 text-xs sm:text-sm transition-all outline-none"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery && (
                <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Global Search Results Dropdown Popover */}
        {searchResultsDropdown}
      </div>
    </div>

    <div className="flex items-center gap-3 md:gap-4">
        {/* Calendar Icon */}
        <Link href="/calendar">
          <button type="button" className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer" title="View Schedule Calendar">
            <Calendar className="w-5 h-5 text-slate-600" />
          </button>
        </Link>

        {/* Bell: the therapist's notifications from the backend */}
        <div className="relative">
          <button 
            type="button" 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 transition-colors relative cursor-pointer focus:outline-none"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#450bc8] rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setShowNotifications(false)} 
              />
              
              {/* Notifications Popover Dropdown */}
              <div className="absolute max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-16 max-sm:mt-0 max-sm:w-auto max-sm:max-w-none sm:right-0 mt-3 w-[calc(100vw-2rem)] max-w-[360px] sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-40 overflow-hidden animate-in fade-in-0 zoom-in-95">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="bg-[#450bc8]/10 text-[#450bc8] text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-xs font-semibold text-[#450bc8] hover:underline cursor-pointer py-2 sm:py-0"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-[min(24rem,50vh)] overflow-y-auto divide-y divide-slate-100">
                  {notificationsFailed && (
                    <div className="p-4 text-center text-xs font-medium text-amber-700 bg-amber-50/60">
                      Couldn&apos;t load notifications.{" "}
                      <button
                        type="button"
                        onClick={refreshNotifications}
                        className="font-bold text-[#450bc8] hover:underline cursor-pointer"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                  {notifications.length === 0 ? (
                    notificationsFailed ? null :
                    <div className="p-6 text-center text-slate-400 text-xs font-medium">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={cn(
                          "w-full text-left p-4 hover:bg-slate-50/80 transition-colors flex gap-3 items-start border-b border-slate-100/80 last:border-b-0 cursor-pointer",
                          !item.read && "bg-purple-50/30"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-[#450bc8] flex items-center justify-center shrink-0 mt-0.5 border border-purple-200">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{item.title}</span>
                              {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-[#450bc8] shrink-0" />}
                            </p>
                            <span className="text-[10px] text-slate-400 shrink-0 font-medium">{formatNotificationTime(item.createdAt)}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.message}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
                  <Link 
                    href="/calendar"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-bold text-[#450bc8] hover:underline cursor-pointer block"
                  >
                    View Calendar →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Outcome Details Modal */}
        <Dialog open={!!selectedOutcome} onOpenChange={(open) => !open && setSelectedOutcome(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-7 rounded-[20px] sm:rounded-[24px] bg-white border-none shadow-2xl space-y-0 gap-0 outline-none">
            {selectedOutcome && (
              <div className="space-y-5">
                <DialogHeader className="space-y-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-2 rounded-xl bg-purple-100 text-[#450bc8] text-lg font-bold">🧠</span>
                    <div>
                      <DialogTitle className="text-xl font-bold text-slate-900">
                        Assessment Outcome Details
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 font-medium">
                        3-Session Assessment Outcome Workflow Calculation
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Client</p>
                      <p className="text-sm font-bold text-slate-900">{selectedOutcome.clientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Milestone</p>
                      <p className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-[#450bc8]">
                        Completed after Session {selectedOutcome.sessionMilestone}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-2 border-t border-slate-200/60">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                      <p className="text-[11px] font-semibold text-slate-500">Previous Score</p>
                      <p className="text-xl font-extrabold text-slate-800 mt-0.5">{selectedOutcome.previousScore}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                      <p className="text-[11px] font-semibold text-slate-500">Current Score</p>
                      <p className="text-xl font-extrabold text-[#450bc8] mt-0.5">{selectedOutcome.currentScore}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                      <p className="text-[11px] font-semibold text-slate-500">Score Change</p>
                      <p className={cn(
                        "text-xl font-extrabold mt-0.5",
                        selectedOutcome.changeValue < 0 && "text-emerald-600",
                        selectedOutcome.changeValue > 0 && "text-amber-600",
                        selectedOutcome.changeValue === 0 && "text-slate-600"
                      )}>
                        {selectedOutcome.changeLabel}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-600">
                  <p className="font-semibold text-slate-800 mb-1">BRD Rule Enforcement:</p>
                  <p>
                    Every time the client completes their scheduled assessment after 3 sessions (Session {selectedOutcome.sessionMilestone}), 
                    the system automatically compares scores and notifies the assigned therapist without pre-judging direction.
                  </p>
                </div>

                {selectedOutcome.details && selectedOutcome.details.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Itemized Breakdown</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {selectedOutcome.details.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl border border-slate-200 bg-white text-xs space-y-1">
                          <p className="font-semibold text-slate-800">{item.q}</p>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Prev: <strong className="text-slate-700">{item.prev}</strong></span>
                            <span>Curr: <strong className="text-[#450bc8]">{item.curr}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOutcome(null)}
                    className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOutcome(null);
                      setLocation("/outcomes");
                    }}
                    className="h-10 px-5 rounded-xl bg-[#450bc8] text-white font-bold text-xs hover:bg-[#3a0aa8] transition-colors cursor-pointer shadow-sm"
                  >
                    Go to Outcomes Dashboard
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Messages Pill Button */}
        <Link href="/messages">
          <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-bold text-xs sm:text-sm h-9 sm:h-10 px-3.5 sm:px-5 shadow-md shadow-[#450bc8]/25 transition-all hover:scale-105 active:scale-95 cursor-pointer">
            <MessageSquare className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span className="hidden sm:inline">Messages</span>
          </button>
        </Link>

        {/* User Profile */}
        <Link href="/profile" className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="relative cursor-pointer">
            <UserAvatar user={user} className="w-10 h-10 rounded-full ring-2 ring-[#450bc8]/30" />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
        </Link>
      </div>
    </div>

      {/* Mobile Search Bar below top header tabs */}
      <div className="px-3 pb-3 sm:hidden relative">
        <div className="relative group z-30">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-[#450bc8] transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search clients and pages..."
            className="w-full bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 focus:bg-white focus:border-[#450bc8] focus:ring-2 focus:ring-[#450bc8]/10 rounded-full pl-9 pr-4 py-2 text-xs transition-all outline-none"
          />
        </div>
        {/* Results on phones (the desktop box and its results are hidden below the sm breakpoint) */}
        <div className="absolute left-3 right-3 top-full -mt-3">{searchResultsDropdown}</div>
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fcfbff] flex text-slate-800 antialiased">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col pl-0 lg:pl-64 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

