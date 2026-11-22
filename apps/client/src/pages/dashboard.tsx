import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { pageTransition, safeFormatDate } from '@/components/shared';
import {
  Video, Users, Clock, Calendar, CheckCircle2,
  PlayCircle, Activity as ActivityIcon, BookOpen, ExternalLink,
  AlertCircle, Plus, MessageSquare
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link, useLocation } from 'wouter';
import { getClientAuth } from '@/lib/auth';
import { getUserSessions, getUserActivities, getUserActivityCompletions, getUserMessages, syncUserMessages, syncUserSessions, syncUserActivities, SessionItem, ActivityStoreItem, MessageItem } from '@/lib/client-store';

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Consecutive days (ending today, or yesterday if nothing is done yet today) with at least one completed activity */
function computeStreak(completions: string[]): number {
  const days = new Set(
    completions.map(c => new Date(c)).filter(d => !isNaN(d.getTime())).map(dayKey)
  );
  if (days.size === 0) return 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function initials(name: string) {
  return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CU';
}

export default function Dashboard() {
  const [location] = useLocation();
  const [scheduleTab, setScheduleTab] = useState<'today' | 'week' | 'month'>('today');
  const [storeTick, setStoreTick] = useState(0);

  const authUser = getClientAuth();
  const [sessions, setSessions] = useState<SessionItem[]>(() => getUserSessions());
  const [activities, setActivities] = useState<ActivityStoreItem[]>(() => getUserActivities());
  const [messages, setMessages] = useState<MessageItem[]>(() => getUserMessages());
  const [completions, setCompletions] = useState<string[]>(() => getUserActivityCompletions());

  // Background sync on mount; assigned activities also refresh when a therapist assigns one
  useEffect(() => {
    syncUserMessages();
    syncUserSessions();
    syncUserActivities();
    const refreshActivities = () => { syncUserActivities(); };
    window.addEventListener('notification_created', refreshActivities);
    return () => window.removeEventListener('notification_created', refreshActivities);
  }, []);

  // Listen to store updates in real-time
  useEffect(() => {
    const handleUpdate = () => {
      setSessions(getUserSessions());
      setActivities(getUserActivities());
      setCompletions(getUserActivityCompletions());
      setMessages(getUserMessages());
      setStoreTick(t => t + 1);
    };

    window.addEventListener('client_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('client_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const clientName = authUser?.name || "Client User";
  const clientEmail = (authUser?.email || "").toLowerCase().trim();
  
  // Real dynamic computations
  const upcomingSessions = sessions.filter(s => s.status === 'upcoming');
  const upcomingSession = upcomingSessions[0] || null;
  const completedActivitiesCount = activities.filter(a => a.status === 'completed').length;
  const streakDays = computeStreak(completions);

  // Focus list: everything still pending, plus what was completed inside the chosen window
  const focusActivities = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const since = scheduleTab === 'today' ? startOfToday
      : scheduleTab === 'week' ? startOfToday - 6 * DAY_MS
      : startOfToday - 29 * DAY_MS;
    return activities
      .filter(a => {
        if (a.status !== 'completed') return true;
        const done = a.completedAt ? new Date(a.completedAt).getTime() : NaN;
        return !isNaN(done) && done >= since;
      })
      .sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0));
  }, [activities, scheduleTab]);
  const focusCompletedCount = focusActivities.filter(a => a.status === 'completed').length;

  // Filter ONLY INCOMING MESSAGES (sent by therapist / practitioner to the client)
  const incomingMessages = useMemo(() => {
    return messages.filter(m => {
      // Explicit therapist role
      if (m.senderRole === 'therapist') return true;
      // Explicit client role is outgoing
      if (m.senderRole === 'client') return false;
      // If sender matches logged in client name or email, it's outgoing
      if (clientName && m.senderName && m.senderName.toLowerCase().trim() === clientName.toLowerCase().trim()) return false;
      return true;
    });
  }, [messages, clientName]);

  const unreadMessagesCount = incomingMessages.filter(m => !m.isRead).length;
  const recentMessage = incomingMessages.length > 0 ? incomingMessages[incomingMessages.length - 1] : null;

  const today = new Date();
  const dayLabel = format(today, 'EEEE, MMMM d');

  const stats = [
    {
      icon: CheckCircle2,
      label: 'Activities Done',
      value: completedActivitiesCount,
      sub: `${completedActivitiesCount} of ${activities.length} finished`,
      delta: completedActivitiesCount > 0 ? `+${completedActivitiesCount}` : '0',
      plus: completedActivitiesCount > 0,
      iconColor: 'text-blue-500',
    },
    {
      icon: Users,
      label: 'Activity Streak',
      value: `${streakDays}d`,
      sub: streakDays > 0 ? 'Keep it going!' : 'Start your first task',
      delta: streakDays > 0 ? `+${streakDays}` : '0',
      plus: streakDays > 0,
      iconColor: 'text-violet-500',
    },
    {
      icon: Clock,
      label: 'Upcoming Sessions',
      value: upcomingSessions.length,
      sub: upcomingSessions.length === 1 ? '1 session booked' : `${upcomingSessions.length} sessions booked`,
      delta: upcomingSessions.length > 0 ? `+${upcomingSessions.length}` : '0',
      plus: upcomingSessions.length > 0,
      iconColor: 'text-teal-500',
    },
  ];

  return (
    <motion.div {...pageTransition} className="space-y-5 pb-12">

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-4 sm:p-5 md:p-6 text-white shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-black/10 rounded-full blur-3xl translate-y-1/2" />
        <div className="relative z-10 flex flex-col lg:flex-row gap-4 sm:gap-5 justify-between items-start lg:items-center">
          <div className="space-y-2 sm:space-y-3 flex-1 w-full">
            <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-0.5 text-[11px] sm:text-xs font-medium backdrop-blur-sm border border-white/10 text-white">
              {dayLabel}
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
                Welcome back, {clientName}
              </h1>
              <p className="text-white/80 text-xs sm:text-sm max-w-lg leading-relaxed">
                Your wellness journey continues &middot; {completedActivitiesCount} of {activities.length} care activities completed.
              </p>
            </div>
          </div>

          {upcomingSession ? (
            <div className="w-full lg:w-[320px] shrink-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 sm:p-3.5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] sm:text-[11px] font-bold tracking-wider text-white/70 uppercase">
                  NEXT SESSION
                </h3>
                <div className="whitespace-nowrap inline-flex items-center rounded-md border font-semibold bg-green-500/20 text-green-300 border-green-500/30 text-[10px] px-2 py-0.5">
                  <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
                  {safeFormatDate(upcomingSession.scheduledAt, 'MMM d')}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-2.5">
                <span className="relative flex shrink-0 overflow-hidden rounded-full h-8 sm:h-9 w-8 sm:w-9 border border-white/20">
                  {upcomingSession.therapistAvatarUrl ? (
                    <img
                      src={upcomingSession.therapistAvatarUrl}
                      alt={upcomingSession.therapistName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-white/10 text-white text-xs font-bold">
                      {initials(upcomingSession.therapistName)}
                    </span>
                  )}
                </span>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm leading-none mb-1 text-white">
                    {upcomingSession.therapistName}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-white/80">
                    {upcomingSession.therapistTitle || 'Therapy Session'} &middot; {upcomingSession.durationMinutes} min
                  </p>
                </div>
              </div>

              <div className="bg-black/20 rounded-lg px-2.5 py-1.5 mb-2.5 flex items-center justify-between text-xs text-white">
                <div className="font-medium">
                  {safeFormatDate(upcomingSession.scheduledAt, 'h:mm a')}
                </div>
                <div className="text-white/70 text-[11px]">Upcoming Appointment</div>
              </div>

              {upcomingSession.joinUrl ? (
                <a
                  href={upcomingSession.joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors border border-transparent min-h-9 px-4 py-2 w-full rounded-full bg-white text-[#4f28d9] hover:bg-white/90 font-bold h-9 text-xs cursor-pointer shadow-md"
                >
                  <Video className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  Join session
                </a>
              ) : (
                <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap border border-white/20 min-h-9 px-4 py-2 w-full rounded-full bg-white/20 text-white font-bold h-9 text-xs opacity-75">
                  <Video className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  Confirmed
                </div>
              )}
            </div>
          ) : (
            <div className="w-full lg:w-[320px] shrink-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 sm:p-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-1 mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">No Upcoming Sessions</h3>
                <p className="text-xs text-white/75">Schedule a consultation with your therapist.</p>
              </div>
              <Link
                href={location.startsWith('/client') ? '/client/sessions?book=true' : '/sessions?book=true'}
                onClick={() => {
                  sessionStorage.setItem('hexpertify_open_booking', 'true');
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors min-h-9 px-4 py-2 w-full rounded-full bg-white text-[#4f28d9] hover:bg-white/90 font-bold h-9 text-xs cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Book a Session
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="hex-card !p-3 sm:!p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-2">
              <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.iconColor} shrink-0`} strokeWidth={2} />
              <span
                className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                  stat.plus
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {stat.delta}
              </span>
            </div>
            <div>
              <p className="text-[11px] sm:text-sm text-muted-foreground font-medium truncate mb-0.5">{stat.label}</p>
              <p className="text-lg sm:text-[2rem] font-extrabold text-foreground leading-none mb-1">{stat.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden xs:block">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom split ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Today's schedule (2/3) */}
        <div className="lg:col-span-2 hex-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[15px] font-bold text-foreground">Today's Focus</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {focusActivities.length} {focusActivities.length === 1 ? 'task' : 'tasks'} &middot; {focusCompletedCount} completed
              </p>
            </div>
            {/* Tab switcher */}
            <div className="flex items-center gap-0.5 p-1 bg-muted rounded-lg overflow-x-auto max-w-full no-scrollbar">
              {(['Today', 'Week', 'Month'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setScheduleTab(tab.toLowerCase() as 'today' | 'week' | 'month')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    scheduleTab === tab.toLowerCase()
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            {focusActivities.length > 0 ? (
              focusActivities.slice(0, 6).map(task => (
                <Link key={task.id} href="/activities" className="block">
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors cursor-pointer group">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      task.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-accent text-primary'
                    }`}>
                      {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <ActivityIcon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold transition-colors truncate ${
                        task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground group-hover:text-primary'
                      }`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.duration} &middot; {task.difficulty} {task.status === 'completed' && '(Completed)'}
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-muted group-hover:bg-primary text-muted-foreground group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                      <PlayCircle className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="font-semibold text-sm">
                  {activities.length === 0 ? 'No activities assigned yet' : 'All caught up!'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activities.length === 0
                    ? 'Activities your therapist assigns will appear here.'
                    : 'Nothing pending right now.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent messages / pending panel (1/3) - SHOW ONLY INCOMING MESSAGES */}
        <div className="hex-card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-bold text-foreground">Messages</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {unreadMessagesCount > 0 
                  ? `${unreadMessagesCount} unread` 
                  : incomingMessages.length > 0 
                  ? 'All caught up' 
                  : 'No incoming messages'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadMessagesCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-[11px] font-semibold">
                  <AlertCircle className="w-3 h-3" />
                  Unread
                </span>
              )}
              <Link href="/messages" className="text-xs font-semibold text-primary hover:underline">
                Open
              </Link>
            </div>
          </div>

          {recentMessage ? (
            <Link href="/messages" className="block flex-1">
              <div className="space-y-3 cursor-pointer group">
                <div className="flex items-center gap-3">
                  {recentMessage.senderAvatarUrl ? (
                    <img
                      src={recentMessage.senderAvatarUrl}
                      className="w-9 h-9 rounded-full shrink-0 object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-accent text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {initials(recentMessage.senderName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {recentMessage.senderName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(recentMessage.sentAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                  {recentMessage.content}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                <MessageSquare className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-foreground">No incoming messages</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[180px]">
                Messages from your therapist will appear here.
              </p>
            </div>
          )}

          {/* Resources teaser */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground">Recommended</p>
              <Link href="/resources" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5">
                View all <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-accent text-primary flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-foreground line-clamp-1 font-medium">Somatic Breathing & Nervous System Regulation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
