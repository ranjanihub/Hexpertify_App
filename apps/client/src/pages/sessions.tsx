import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGetSessions, useCancelSession } from '@workspace/api-client-react';
import { pageTransition, staggerContainer, staggerItem, PageHeader, safeFormatDate } from '@/components/shared';
import { Calendar, Clock, Video, XCircle, RefreshCw, AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetSessionsQueryKey } from '@workspace/api-client-react';
import { BookingModal } from '@/components/booking-modal';
import { useSearch } from 'wouter';
import { getClientAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

import { getUserSessions, cancelUserSession, deleteUserSession, SessionItem } from '@/lib/client-store';

/** Friendly labels for the canonical booking statuses */
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending confirmation',
  PENDING_PAYMENT: 'Awaiting payment',
  EXPIRED: 'Payment expired',
  CONFIRMED: 'Confirmed',
  RESCHEDULED: 'Rescheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW_CLIENT: 'Missed (no-show)',
  NO_SHOW_CONSULTANT: 'Therapist did not join',
};

const statusLabel = (status?: string, fallback = '') =>
  STATUS_LABELS[String(status || '').toUpperCase()] || fallback;

/** Website bookings are paid first and scheduled later: they have no session time yet */
const isUnscheduled = (session: any): boolean =>
  !!session?.toBeScheduled || !session?.scheduledAt;

export default function SessionsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [storeSessions, setStoreSessions] = useState<SessionItem[]>(() => getUserSessions());
  const { data: apiSessions, isLoading } = useGetSessions({ status: activeTab });
  const cancelMutation = useCancelSession();
  const queryClient = useQueryClient();
  const searchStr = useSearch();

  const authUser = getClientAuth();
  const [assignedTherapist, setAssignedTherapist] = useState<any>(null);

  // Fetch client's assigned therapist if not present in session list (especially for new clients)
  useEffect(() => {
    const fetchTherapist = async () => {
      try {
        const userParam = authUser?.email ? `?email=${encodeURIComponent(authUser.email)}` : '';
        let res = await fetch(`/api/client/therapist${userParam}`).catch(() => null);
        if (!res || !res.ok) {
          res = await fetch(`http://localhost:5000/api/client/therapist${userParam}`).catch(() => null);
        }
        if (res && res.ok) {
          const data = await res.json();
          if (data?.success && data?.therapist) {
            setAssignedTherapist(data.therapist);
          }
        }
      } catch {}
    };
    fetchTherapist();
  }, [authUser?.email]);

  // Automatically trigger Booking Modal if redirected with booking trigger from dashboard
  useEffect(() => {
    const params = new URLSearchParams(searchStr || window.location.search);
    const shouldOpen =
      params.get('book') === 'true' ||
      params.get('booking') === 'true' ||
      params.get('action') === 'book' ||
      sessionStorage.getItem('hexpertify_open_booking') === 'true';

    if (shouldOpen) {
      setIsBookingOpen(true);
      sessionStorage.removeItem('hexpertify_open_booking');

      // Clean up URL parameter cleanly without reloading
      if (params.has('book') || params.has('booking') || params.has('action')) {
        params.delete('book');
        params.delete('booking');
        params.delete('action');
        const remaining = params.toString();
        const cleanUrl = window.location.pathname + (remaining ? `?${remaining}` : '');
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, [searchStr]);

  useEffect(() => {
    const handleUpdate = () => {
      setStoreSessions(getUserSessions());
    };
    window.addEventListener('client_data_updated', handleUpdate);
    return () => window.removeEventListener('client_data_updated', handleUpdate);
  }, []);

  const allSessions = (Array.isArray(apiSessions) && apiSessions.length > 0) ? apiSessions : storeSessions;
  const sessions = allSessions.filter((s: any) => s.status === activeTab);

  const canReschedule = (scheduledAtStr?: string): boolean => {
    if (!scheduledAtStr) return true;
    const sessionTime = new Date(scheduledAtStr).getTime();
    if (isNaN(sessionTime)) return true;
    const diffHours = (sessionTime - Date.now()) / (1000 * 60 * 60);
    return diffHours >= 3;
  };

  const handleCancel = (id: number | string) => {
    if (confirm('Are you sure you want to cancel this session?')) {
      cancelUserSession(id);
      setStoreSessions(getUserSessions());
      queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey({ status: 'upcoming' }) });
      queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey({ status: 'cancelled' }) });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({
        title: 'Session Cancelled',
        description: 'Your appointment has been cancelled and therapist notified.',
      });
    }
  };

  const handleDelete = (id: number | string) => {
    if (confirm('Are you sure you want to permanently delete this slot/booking?')) {
      deleteUserSession(id);
      setStoreSessions(getUserSessions());
      queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey({ status: 'upcoming' }) });
      queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey({ status: 'cancelled' }) });
      queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey({ status: 'past' }) });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({
        title: 'Slot Removed',
        description: 'Session slot was permanently removed from schedule.',
      });
    }
  };

  return (
    <motion.div {...pageTransition} className="w-full space-y-8 pb-12">
      <PageHeader 
        title="Sessions" 
        description="Manage your therapy appointments and view upcoming schedule."
      >
        <button 
          onClick={() => setIsBookingOpen(true)}
          className="px-5 py-2.5 rounded-full font-bold text-sm bg-white text-[#431bb5] hover:bg-white/90 shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Book New Session
        </button>
      </PageHeader>

      <div className="flex gap-1.5 sm:gap-2 p-1 bg-muted/50 rounded-xl w-full sm:w-fit overflow-x-auto no-scrollbar">
        {(['upcoming', 'past', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm capitalize transition-all shrink-0 cursor-pointer ${
              activeTab === tab 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2].map(i => <div key={i} className="h-48 bg-muted rounded-[24px]"></div>)}
        </div>
      ) : sessions?.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-[24px] border border-border">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">No {activeTab} sessions</h3>
          <p className="text-sm text-muted-foreground mt-1">Your {activeTab} therapy appointments will appear here.</p>
          {activeTab !== 'upcoming' && (
            <button
              onClick={() => setIsBookingOpen(true)}
              className="mt-4 px-4 py-2 rounded-full font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Book a Session Now
            </button>
          )}
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
          {sessions.map((session) => (
            <motion.div key={session.id} variants={staggerItem} className="hex-card !p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  {isUnscheduled(session) ? (
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <Calendar className="w-4 h-4" />
                      <span>To be scheduled</span>
                      <span className="text-xs font-medium text-muted-foreground">
                        Our team will share time slots shortly ({session.durationMinutes} mins)
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-primary font-semibold">
                        <Calendar className="w-4 h-4" />
                        <span>{safeFormatDate(session.scheduledAt, 'EEEE, MMMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                        <Clock className="w-4 h-4" />
                        <span>{safeFormatDate(session.scheduledAt, 'h:mm a')} ({session.durationMinutes} mins)</span>
                      </div>
                    </>
                  )}
                  {activeTab === 'upcoming' && ['PENDING', 'RESCHEDULED'].includes(String((session as any).bookingStatus || '').toUpperCase()) && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-border bg-muted/40 text-muted-foreground">
                      {statusLabel((session as any).bookingStatus)}
                    </span>
                  )}
                </div>

                {session.notes && (
                  <p className="text-sm text-muted-foreground">{session.notes}</p>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-full border border-border/50">
                    <img 
                      src={
                        session.therapistAvatarUrl && !session.therapistAvatarUrl.includes('photo-1559839734')
                          ? session.therapistAvatarUrl 
                          : "https://res.cloudinary.com/ddgvdabyf/image/upload/v1766954534/uploads/orwxj9dw0f2bnj5cgxex.webp"
                      } 
                      alt={session.therapistName} 
                      className="w-8 h-8 rounded-full object-cover border border-primary/20" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://res.cloudinary.com/ddgvdabyf/image/upload/v1766954534/uploads/orwxj9dw0f2bnj5cgxex.webp";
                      }}
                    />
                    <span className="font-semibold text-sm text-foreground">
                      {session.therapistName?.includes(' - By ') 
                        ? session.therapistName.split(' - By ').pop()?.trim() 
                        : session.therapistName || 'Assigned Therapist'}
                    </span>
                  </div>
                  
                  {activeTab === 'upcoming' && !isUnscheduled(session) && !canReschedule(session.scheduledAt) && (
                    <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Reschedule locked (&lt; 3h to session)
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border mt-auto">
                  {activeTab === 'upcoming' && (
                    <>
                      {session.joinUrl && !isUnscheduled(session) ? (
                        <a href={session.joinUrl} target="_blank" rel="noreferrer" className="hex-button-primary flex-1 sm:flex-none gap-2">
                          <Video className="w-5 h-5" /> Join Session
                        </a>
                      ) : (
                        <button disabled className="h-[48px] px-6 rounded-full bg-muted text-muted-foreground font-semibold flex items-center justify-center flex-1 sm:flex-none cursor-not-allowed">
                          Link available soon
                        </button>
                      )}
                      <div className="flex gap-2.5 w-full sm:w-auto mt-3 sm:mt-0 sm:ml-auto items-center">
                        {canReschedule(session.scheduledAt) ? (
                          <button 
                            onClick={() => setIsBookingOpen(true)}
                            className="hex-button-outline flex-1 sm:flex-none gap-2 text-sm cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4" /> Reschedule
                          </button>
                        ) : (
                          <div className="relative group flex-1 sm:flex-none">
                            <button 
                              type="button"
                              disabled
                              className="h-[48px] px-5 rounded-full bg-slate-100 dark:bg-muted/40 text-slate-400 dark:text-muted-foreground font-semibold flex items-center justify-center w-full text-sm gap-2 cursor-not-allowed border border-slate-200/80 dark:border-border/50 opacity-70"
                            >
                              <RefreshCw className="w-4 h-4 opacity-40" /> Reschedule
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap pointer-events-none z-20">
                              Reschedule option is only available 3 hrs before session
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={() => handleCancel(session.id)}
                          className="h-[48px] px-5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-center flex-1 sm:flex-none hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors text-sm gap-1.5 cursor-pointer border border-amber-200/60 dark:border-amber-800/40"
                          title="Cancel session"
                        >
                          <XCircle className="w-4 h-4" /> Cancel
                        </button>

                        <button 
                          onClick={() => handleDelete(session.id)}
                          className="h-[48px] px-4 rounded-full bg-red-50 dark:bg-red-950/30 text-destructive font-semibold flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors text-sm gap-1.5 cursor-pointer border border-red-200/60 dark:border-red-800/40"
                          title="Delete slot permanently"
                        >
                          <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </>
                  )}
                  {activeTab === 'past' && (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-success font-medium bg-success-bg px-4 py-2 rounded-lg text-sm">
                        <CheckCircle2 className="w-4 h-4" /> {statusLabel((session as any).bookingStatus, 'Completed')}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsBookingOpen(true)}
                          className="px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Book Follow-up
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Remove from history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  {activeTab === 'cancelled' && (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-destructive font-medium bg-red-50 px-4 py-2 rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4" /> {statusLabel((session as any).bookingStatus, 'Cancelled')}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsBookingOpen(true)}
                          className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Rebook Slot
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Remove from history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Therapist Availability Popup Modal */}
      <BookingModal 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)}
        therapistId={assignedTherapist?.id || authUser?.assignedTherapistId || undefined}
        therapistEmail={assignedTherapist?.email || authUser?.assignedTherapistEmail || undefined}
        therapistName={assignedTherapist?.name || authUser?.assignedTherapistName || sessions[0]?.therapistName || "Your Assigned Consultant"}
        therapistAvatar={assignedTherapist?.avatarUrl || authUser?.assignedTherapistPhoto || sessions[0]?.therapistAvatarUrl || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80"}
        therapistTitle={assignedTherapist?.title || (sessions[0] as any)?.therapistTitle || "Licensed Psychologist"}
        onBookingSuccess={() => {
          setStoreSessions(getUserSessions());
          setActiveTab('upcoming');
        }}
      />
    </motion.div>
  );
}
