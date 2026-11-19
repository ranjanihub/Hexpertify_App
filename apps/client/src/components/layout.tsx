import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  User,
  Video,
  Activity as ActivityIcon,
  ClipboardList,
  LineChart,
  BookOpen,
  MessageSquare,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  Calendar,
  CalendarCheck,
  Flag,
  Plus,
  Check,
  CheckCheck,
  Brain,
  ArrowRight,
  X,
  Pin,
  Download,
  Smartphone,
  Laptop,
  Copy,
  ExternalLink,
  Bookmark,
  Sparkles
} from 'lucide-react';
import { useGetClientProfile } from '@workspace/api-client-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExpertifyLogo } from './logo';
import { SessionFeedbackPrompt } from './session-feedback-prompt';
import { PushNotificationsBanner } from './push-notifications-banner';
import { isRunningAsInstalledApp, promptInstall } from '@/lib/install-prompt';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { useToast } from '@/hooks/use-toast';

const NAV_SECTIONS = [
  {
    label: 'OVERVIEW',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/therapist', label: 'My Therapist', icon: User },
      { path: '/sessions', label: 'Sessions', icon: Video },
      { path: '/messages', label: 'Messages', icon: MessageSquare },
    ],
  },
  {
    label: 'MY CARE',
    items: [
      { path: '/activities', label: 'Activities', icon: ActivityIcon },
      { path: '/assessments', label: 'Assessments', icon: ClipboardList },
      { path: '/progress', label: 'Progress', icon: LineChart },
    ],
  },
  {
    label: 'RESOURCES',
    items: [
      { path: '/resources', label: 'Resources', icon: BookOpen },
    ],
  },
];

/** The signed-in client, re-read whenever the login changes or the page changes, so the name never goes stale */
function useLiveClientAuth() {
  const [location] = useLocation();
  const [, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener('auth_state_change', refresh);
    window.addEventListener('client_data_updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('auth_state_change', refresh);
      window.removeEventListener('client_data_updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  void location;
  return getClientAuth();
}

function initials(name: string) {
  return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AM';
}

function RedHairAvatar({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="40" fill="#FFF0ED" />
      {/* Hair back */}
      <path d="M18 45C16 30 24 12 40 12C56 12 64 30 62 45C62 55 60 62 58 66H22C20 62 18 55 18 45Z" fill="#E24D28" />
      {/* Neck */}
      <path d="M34 50H46V60H34V50Z" fill="#FAD1C0" />
      {/* Shoulders / Shirt */}
      <path d="M20 72C20 60 29 56 40 56C51 56 60 60 60 72V80H20V72Z" fill="#74C0FC" />
      <path d="M35 56L40 66L45 56H35Z" fill="#FFFFFF" />
      {/* Face */}
      <path d="M25 38C25 28 32 23 40 23C48 23 55 28 55 38C55 48 48 53 40 53C32 53 25 48 25 38Z" fill="#FAD1C0" />
      {/* Hair front */}
      <path d="M23 34C23 23 31 15 40 15C49 15 57 23 57 34C54 26 47 22 40 22C33 22 26 26 23 34Z" fill="#E24D28" />
      <path d="M24 30C28 22 35 18 40 23C45 18 52 22 56 30C52 23 45 19 40 21C35 19 28 23 24 30Z" fill="#C93B18" />
      {/* Eyes */}
      <circle cx="34" cy="38" r="2" fill="#3A2521" />
      <circle cx="46" cy="38" r="2" fill="#3A2521" />
      {/* Cheeks */}
      <circle cx="31" cy="42" r="2.5" fill="#FFB0A0" opacity="0.6" />
      <circle cx="49" cy="42" r="2.5" fill="#FFB0A0" opacity="0.6" />
      {/* Mouth */}
      <path d="M37 44C38.5 45.5 41.5 45.5 43 44" stroke="#C95B53" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

import { logoutClient, getClientAuth } from '@/lib/auth';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { data: profile } = useGetClientProfile();
  const [showLogout, setShowLogout] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handlePerformLogout = () => {
    logoutClient();
    setShowLogout(false);
    setLocation('/login');
  };

  const handleDownloadShortcut = () => {
    try {
      const targetUrl = window.location.origin + '/client';
      const shortcutContent = `[InternetShortcut]\nURL=${targetUrl}\nIconIndex=0\nHotKey=0\n[{000214A0-0000-0000-C000-000000000046}]\nProp3=19,11\n`;
      const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Hexpertify Portal.url';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Shortcut Downloaded!",
        description: "Desktop shortcut 'Hexpertify Portal.url' downloaded. Drag it to your Desktop or Taskbar.",
      });
    } catch {
      toast({
        title: "Download Failed",
        description: "Could not create shortcut file. You can bookmark this page with Ctrl + D.",
        variant: "destructive"
      });
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.origin + '/client');
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      toast({
        title: "Link Copied!",
        description: "Portal URL copied to clipboard.",
      });
    } catch {}
  };

  useEffect(() => {
    const handleInstalled = () => {
      toast({
        title: "Hexpertify installed!",
        description: "Open it from your desktop, Start menu or home screen. To pin it, right-click its taskbar icon and choose Pin to taskbar.",
      });
    };
    window.addEventListener('appinstalled', handleInstalled);
    return () => window.removeEventListener('appinstalled', handleInstalled);
  }, [toast]);

  const handleAddToShortcut = async () => {
    if (isRunningAsInstalledApp()) {
      toast({ title: "Already installed", description: "You're using the Hexpertify app." });
      return;
    }

    // Chrome / Edge / Android: the browser's own install dialog creates the desktop or home-screen shortcut
    const outcome = await promptInstall();
    if (outcome !== 'unavailable') return;

    // Safari / Firefox (no install API), or the browser hasn't offered an install on this visit
    setShowPinModal(true);
  };

  const authUser = useLiveClientAuth();
  const displayName = authUser?.name || profile?.name || 'Client User';
  const displayAvatar = authUser?.avatarUrl || profile?.avatarUrl;

  const navContent = (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Top Logo Header */}
      <div className="p-6 pb-4 border-b border-sidebar-border/50 flex items-center justify-between">
        <Link href="/" onClick={onCloseMobile}>
          <ExpertifyLogo />
        </Link>
        {onCloseMobile && (
          <button 
            onClick={onCloseMobile} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 md:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="space-y-1">
            <span className="px-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              {section.label}
            </span>
            <div className="space-y-0.5 pt-1">
              {section.items.map((item) => {
                const isActive = location === item.path;
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path} onClick={onCloseMobile}>
                    <div
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                        <span>{item.label}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-sidebar-border pt-3 space-y-2">
        {/* User profile card acting as Profile button */}
        <Link href="/profile" onClick={onCloseMobile} className="block group">
          <div className="p-3 rounded-2xl bg-[#F5F6F9] dark:bg-muted/50 border border-slate-200/50 dark:border-border/40 shadow-xs hover:border-primary/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-gradient-to-tr from-[#4f28d9] to-[#8b5cf6] text-white font-bold text-xs flex items-center justify-center group-hover:ring-2 group-hover:ring-primary/20 transition-all shadow-sm">
                {displayAvatar ? (
                  <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>
                    {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[13px] font-bold text-slate-800 dark:text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                  {displayName}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-muted-foreground truncate leading-tight mt-0.5 font-normal capitalize">
                  {authUser?.role || 'Client'}
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* Add to Shortcut / Pin App Button */}
        <button
          type="button"
          onClick={handleAddToShortcut}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 bg-purple-50 dark:bg-purple-950/40 text-[#5e2be2] dark:text-purple-300 hover:bg-[#5e2be2] hover:text-white dark:hover:bg-[#5e2be2] dark:hover:text-white text-[12px] font-bold cursor-pointer border border-purple-200/80 dark:border-purple-800/60 shadow-xs group"
          title="Add shortcut to desktop or pin to home screen"
        >
          <div className="flex items-center gap-2">
            <Pin className="w-3.5 h-3.5 shrink-0 group-hover:rotate-12 transition-transform" strokeWidth={2.5} />
            <span>Add to Shortcut</span>
          </div>
          <span className="text-[10px] font-extrabold bg-[#5e2be2] text-white group-hover:bg-white group-hover:text-[#5e2be2] px-2 py-0.5 rounded-full transition-colors shadow-xs">
            Pin
          </span>
        </button>

        {/* Sign out */}
        <button
          onClick={() => setShowLogout(true)}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-150 text-muted-foreground hover:bg-red-50 hover:text-destructive text-[13px] font-medium cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex-col z-30 hidden md:flex">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar z-50 md:hidden shadow-2xl flex flex-col"
            >
              {navContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Add to Shortcut & Pin Instructions Modal */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-7 border border-border space-y-5 text-foreground relative overflow-hidden font-sans"
            >
              {/* Decorative top glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-[#5e2be2] flex items-center justify-center shrink-0 shadow-sm border border-purple-200/50">
                    <Pin className="w-6 h-6 rotate-12" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      Add Hexpertify Shortcut
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Install Hexpertify for 1-click access from your desktop, taskbar or home screen.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-muted cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step Options Grid */}
              <div className="space-y-3 relative z-10 text-xs">
                {/* 1. Chrome / Edge: install as an app (desktop + Start menu shortcut) */}
                <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                    <Laptop className="w-4 h-4 text-[#5e2be2]" />
                    <span>Computer (Chrome or Edge)</span>
                  </div>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    <li>Click the <span className="font-bold text-[#5e2be2]">Install (⊕)</span> icon at the right end of the address bar.<br />
                      <span className="text-slate-500">Or open the browser menu (⋮): Chrome → <span className="font-semibold">Cast, save and share → Install page as app</span>; Edge → <span className="font-semibold">Apps → Install this site as an app</span>.</span></li>
                    <li>Hexpertify is added to your <span className="font-bold">Desktop</span> and <span className="font-bold">Start menu</span>.</li>
                    <li>To pin it, open the app, right-click its icon in the taskbar and choose <span className="font-bold">Pin to taskbar</span>.</li>
                  </ol>
                </div>

                {/* 2. Phone / tablet home screen */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <Smartphone className="w-4 h-4 text-[#5e2be2]" />
                    <span>Phone or Tablet Home Screen</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    <span className="font-bold">iPhone / iPad (Safari):</span> tap <span className="font-bold">Share (⎙) → Add to Home Screen</span>.<br />
                    <span className="font-bold">Android (Chrome):</span> tap <span className="font-bold">Menu (⋮) → Add to Home screen</span> (or <span className="font-bold">Install app</span>).
                  </p>
                </div>

                {/* 3. Chrome New Tab shortcut tiles (browsers only allow adding these by hand) */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <Sparkles className="w-4 h-4 text-[#5e2be2]" />
                    <span>Chrome New Tab Shortcut</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Open a <span className="font-bold">new tab</span>, click <span className="font-bold">+ Add shortcut</span>, name it <span className="font-bold">Hexpertify</span> and paste the portal link (use <span className="font-bold">Copy Portal URL</span> below).
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadShortcut}
                    className="pt-1 text-[11px] font-semibold text-[#5e2be2] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Prefer a file? Download a desktop shortcut (Windows)</span>
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 relative z-10">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-muted flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? "Link Copied!" : "Copy Portal URL"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-6 py-2 rounded-xl bg-[#5e2be2] hover:bg-[#4d1fc4] text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout dialog */}
      <AnimatePresence>
        {showLogout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLogout(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              onClick={e => e.stopPropagation()}
              className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-border"
            >
              <div className="w-11 h-11 rounded-xl bg-red-50 text-destructive flex items-center justify-center mb-4">
                <LogOut className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold mb-1.5">Sign out</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Are you sure you want to sign out?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogout(false)} className="flex-1 hex-button-outline">
                  Cancel
                </button>
                <button
                  onClick={handlePerformLogout}
                  className="flex-1 h-[40px] sm:h-[44px] px-5 rounded-lg bg-destructive text-white text-sm font-semibold flex items-center justify-center transition-all hover:brightness-110"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface TopNavProps {
  onOpenMobileSidebar?: () => void;
}

/** "Just now", "5m ago", "3:42 PM" (today), "Yesterday", "Oct 13" */
function formatNotificationTime(createdAt?: string): string {
  const at = createdAt ? new Date(createdAt) : null;
  if (!at || isNaN(at.getTime())) return '';
  const minutes = Math.floor((Date.now() - at.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (at >= startOfToday) return at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (at >= new Date(startOfToday.getTime() - 86400000)) return 'Yesterday';
  return at.toLocaleDateString([], { month: 'short', day: 'numeric', ...(at.getFullYear() !== startOfToday.getFullYear() && { year: 'numeric' }) });
}

/** Titles are plain text; older notifications carry emoji */
const cleanTitle = (title?: string) =>
  String(title || '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();

export function TopNav({ onOpenMobileSidebar }: TopNavProps) {
  const { data: profile } = useGetClientProfile();
  const authUser = useLiveClientAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  const displayName = authUser?.name || profile?.name || 'Client User';
  const displayAvatar = authUser?.avatarUrl || profile?.avatarUrl;

  const fetchClientNotifications = useCallback(() => {
    const userEmail = (authUser?.email || profile?.email || '').trim().toLowerCase();
    const userId = authUser?.id || '';
    const params = new URLSearchParams({ role: 'CLIENT' });
    if (userEmail) params.append('recipientEmail', userEmail);
    if (userId) params.append('recipientId', userId);

    fetch(`/api/notifications?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data?.success && Array.isArray(data?.notifications)) {
          setNotifications(data.notifications);
        } else {
          setNotifications([]);
        }
      })
      .catch(() => {
        // Leave notifications as whatever was previously fetched or empty array
      });
  }, [authUser?.email, authUser?.id, profile?.email]);

  useEffect(() => {
    fetchClientNotifications();
    const interval = setInterval(fetchClientNotifications, 15000);
    window.addEventListener('auth_state_change', fetchClientNotifications);
    window.addEventListener('client_data_updated', fetchClientNotifications);
    window.addEventListener('notification_created', fetchClientNotifications);
    window.addEventListener('storage', fetchClientNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener('auth_state_change', fetchClientNotifications);
      window.removeEventListener('client_data_updated', fetchClientNotifications);
      window.removeEventListener('notification_created', fetchClientNotifications);
      window.removeEventListener('storage', fetchClientNotifications);
    };
  }, [fetchClientNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const userEmail = (authUser?.email || profile?.email || '').trim().toLowerCase();
    fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'CLIENT', recipientEmail: userEmail })
    }).catch(() => {});
  };

  const markAsRead = (id: string | number) => {
    setNotifications(prev => prev.map(n => (n.id === id || n._id === id) ? { ...n, read: true } : n));
    fetch(`/api/notifications/${id}/read`, {
      method: 'PUT'
    }).catch(() => {});
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#eef1f6] shadow-xs">
      <div className="h-16 md:h-20 px-3 sm:px-6 md:px-8 flex items-center justify-between gap-2">
        {/* Left Mobile Menu Toggle & Brand Logo */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {onOpenMobileSidebar && (
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <h1 className="hidden sm:block text-base sm:text-lg md:text-xl font-bold text-slate-800 tracking-tight truncate">
            Welcome back, <span className="text-[#5e2be2]">{displayName}</span>
          </h1>
        </div>

        {/* Global Search Bar (Desktop) */}
        <div className="hidden lg:flex items-center justify-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search sessions, notes, activities..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-full bg-slate-50/80 border border-slate-200/80 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 sm:gap-3 md:gap-4 shrink-0">
          <Link href="/sessions">
            <button type="button" className="p-2 sm:p-2.5 rounded-full text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer" title="View Schedule Calendar">
              <Calendar className="w-4.5 sm:w-5 h-4.5 sm:h-5 text-slate-600" aria-hidden="true" />
            </button>
          </Link>

          {/* Notifications Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="relative">
                <button type="button" className="p-2 sm:p-2.5 rounded-full text-slate-500 hover:bg-slate-100 transition-colors relative cursor-pointer focus:outline-none" title="Notifications">
                  <Bell className="w-4.5 sm:w-5 h-4.5 sm:h-5 text-slate-600" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#5e2be2] rounded-full ring-2 ring-white animate-pulse" />
                  )}
                </button>
              </div>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[380px] sm:w-[410px] max-w-[calc(100vw-24px)] p-0 shadow-2xl rounded-3xl border border-slate-200 overflow-hidden font-sans">
              {/* Popover Header */}
              <div className="p-4 bg-[#5e2be2] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <h3 className="font-bold text-sm">Notifications</h3>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-xs font-semibold text-white/90 hover:text-white hover:bg-white/15 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100 bg-white">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-medium">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((item) => {
                    const notifId = item.id || item._id;
                    const isActivity = item.type === 'ACTIVITY_ASSIGNED' || item.type === 'activity';
                    const isAssessment = item.type === 'ASSESSMENT_ASSIGNED' || item.type === 'assessment';
                    const typeUpper = String(item.type || '').toUpperCase();
                    const isSession = typeUpper.startsWith('SESSION') || typeUpper.includes('BOOKING');
                    const isMessage = typeUpper.includes('MESSAGE');
                    const timeLabel = item.time || formatNotificationTime(item.createdAt);
                    const notifLink = item.link || (isActivity ? '/activities' : isAssessment ? '/assessments' : item.type === 'outcome' ? '/progress' : item.type === 'message' ? '/messages' : item.type === 'SESSION_RESCHEDULED' ? '/sessions' : '/progress');
                    
                    return (
                      <div
                        key={notifId}
                        className={`p-4 hover:bg-slate-50/70 transition-colors ${!item.read ? 'bg-purple-50/20' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isActivity
                              ? 'bg-amber-100 text-amber-600'
                              : isAssessment
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-purple-100 text-[#5e2be2]'
                          }`}>
                            {isActivity ? (
                              <ActivityIcon className="w-4.5 h-4.5" />
                            ) : isAssessment ? (
                              <ClipboardList className="w-4.5 h-4.5" />
                            ) : isSession ? (
                              <CalendarCheck className="w-4.5 h-4.5" />
                            ) : isMessage ? (
                              <MessageSquare className="w-4.5 h-4.5" />
                            ) : (
                              <Brain className="w-4.5 h-4.5" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`text-xs text-slate-900 ${!item.read ? 'font-extrabold' : 'font-semibold'}`}>{cleanTitle(item.title)}</span>
                                {!item.read && (
                                  <span className="w-2 h-2 rounded-full bg-[#5e2be2] shrink-0" aria-label="Unread" />
                                )}
                              </div>
                              <span
                                className="text-[11px] font-medium text-slate-400 whitespace-nowrap shrink-0"
                                title={item.createdAt ? new Date(item.createdAt).toLocaleString() : undefined}
                              >
                                {timeLabel}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 font-medium leading-normal">
                              {item.description || item.message}
                            </p>

                            {item.type === 'outcome' && item.metricName && (
                              <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 text-xs my-2">
                                <div className="flex items-center justify-between font-bold">
                                  <span className="text-slate-700">{item.metricName}</span>
                                  <span className="font-mono text-slate-900 font-extrabold">{item.scoreChange}</span>
                                </div>
                                {item.pointsLabel && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-[11px]">Change:</span>
                                    <span className="bg-emerald-100 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full text-[11px] border border-emerald-200">
                                      {item.pointsLabel}
                                    </span>
                                  </div>
                                )}
                                {item.sessionTag && (
                                  <p className="text-[11px] text-slate-400 font-normal border-t border-slate-200/60 pt-1.5 mt-1">
                                    {item.sessionTag}
                                  </p>
                                )}
                              </div>
                            )}

                            <Link
                              href={notifLink}
                              onClick={() => markAsRead(notifId)}
                              className="inline-flex items-center gap-1 text-xs font-extrabold text-[#5e2be2] hover:underline pt-0.5"
                            >
                              <span>
                                {isActivity
                                  ? 'Start Activity'
                                  : isAssessment
                                  ? 'Start Assessment'
                                  : item.type === 'outcome'
                                  ? 'View Outcome'
                                  : item.type === 'message'
                                  ? 'View Message'
                                  : 'View Details'}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Popover Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <Link 
                  href="/progress" 
                  className="text-xs font-extrabold text-[#5e2be2] hover:underline inline-flex items-center gap-1.5"
                >
                  <span>View All Outcomes Workflow</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </PopoverContent>
          </Popover>

        {/* Message button - Circular on mobile, pill with text on desktop */}
        <Link href="/messages">
          <button 
            type="button" 
            className="w-9 h-9 sm:w-auto sm:h-10 rounded-full bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs sm:text-sm flex items-center justify-center sm:px-4 shadow-md shadow-[#5e2be2]/25 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            title="Messages"
          >
            <MessageSquare className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Messages</span>
          </button>
        </Link>

        {/* User profile link */}
        <Link href="/profile" className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200 shrink-0">
          <div className="relative cursor-pointer">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt="User Avatar"
                className="w-8 sm:w-10 h-8 sm:h-10 rounded-full object-cover ring-2 ring-[#5e2be2]/30"
              />
            ) : (
              <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-gradient-to-tr from-[#4f28d9] to-[#8b5cf6] text-white font-bold text-xs sm:text-sm flex items-center justify-center ring-2 ring-[#5e2be2]/30 shadow-sm">
                {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 sm:w-3 h-2.5 sm:h-3 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
        </Link>
      </div>
    </div>

      {/* Mobile Search Bar below top header tabs */}
      <div className="px-3 pb-3 sm:hidden">
        <div className="relative group z-30">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-[#5e2be2] transition-colors" aria-hidden="true" />
          <input
            placeholder="Search sessions, activities..."
            className="w-full bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 rounded-full pl-9 pr-4 py-2 text-xs transition-all outline-none"
            type="text"
          />
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, [location]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64 w-full min-w-0">
        <TopNav onOpenMobileSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-x-hidden w-full max-w-full">
          <PushNotificationsBanner />
          {children}
        </main>
      </div>
      <SessionFeedbackPrompt />
    </div>
  );
}
