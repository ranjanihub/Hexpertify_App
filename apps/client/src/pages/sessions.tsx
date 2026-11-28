import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { pageTransition, staggerContainer, staggerItem, PageHeader, safeFormatDate } from '@/components/shared';
import { Calendar, Clock, Video, XCircle, RefreshCw, AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { BookingModal } from '@/components/booking-modal';
import { useSearch } from 'wouter';
import { getClientAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

import { getUserSessions, syncUserSessions, cancelUserSession, hideUserSession, SessionItem } from '@/lib/client-store';

/** Cancelling and rescheduling close this many hours before a session starts (Refund Policy) */
const CHANGE_CUTOFF_HOURS = 3;

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
  // The list always comes from the server when the page opens (a deep link or a notification click included)
  const [isLoading, setIsLoading] = useState<boolean>(() => getUserSessions().length === 0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<SessionItem | null>(null);
  const searchStr = useSearch();

  const authUser = getClientAuth();
  const [assignedTherapist, setAssignedTherapist] = useState<any>(null);

  useEffect(() => {
    let active = true;
    syncUserSessions()
      .then((list) => active && setStoreSessions(list))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Fetch client's assigned therapist if not present in session list (especially for new clients)
  useEffect(() => {
    const fetchTherapist = async () => {
      try {
        const userParam = authUser?.email ? `?email=${encodeURIComponent(authUser.email)}` : '';
        const res = await fetch(`/api/client/therapist${userParam}`).catch(() => null);
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

  const sessions = storeSessions.filter((s) => s.status === activeTab);

  /** Cancel and reschedule stay open until 3 hours before the start (always for sessions not scheduled yet) */
  const canChange = (scheduledAtStr?: string): boolean => {
    if (!scheduledAtStr) return true;
    const sessionTime = new Date(scheduledAtStr).getTime();
    if (isNaN(sessionTime)) return true;
    return (sessionTime - Date.now()) / (1000 * 60 * 60) >= CHANGE_CUTOFF_HOURS;
  };

  const handleCancel = async (id: number | string) => {
    if (!confirm('Cancel this session? Refunds follow our refund policy.')) return;
    setBusyId(String(id));
    const result = await cancelUserSession(id);
    setBusyId(null);
    setStoreSessions(getUserSessions());
    toast(
      result.ok
        ? { title: 'Session cancelled', description: 'Your therapist has been told.' }
        : { title: 'Session not cancelled', description: result.error, variant: 'destructive' }
    );
  };

  // Removes a past or cancelled session from this list only (the record stays with your therapist)
  const handleRemove = async (id: number | string) => {
    if (!confirm('Remove this session from your list?')) return;
    setBusyId(String(id));
    const result = await hideUserSession(id);
    setBusyId(null);
    setStoreSessions(getUserSessions());
    toast(
      result.ok
        ? { title: 'Removed from your list' }
        : { title: 'Not removed', description: result.error, variant: 'destructive' }
    );
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
          <button
            onClick={() => setIsBookingOpen(true)}
            className="mt-4 px-4 py-2.5 sm:py-2 rounded-full font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Book a Session Now
          </button>
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
          {sessions.map((session) => (
            <motion.div key={session.id} variants={staggerItem} className="hex-card !p-4 sm:!p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="space-y-3 flex-1 min-w-0 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  {isUnscheduled(session) ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-primary font-semibold">
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

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="flex items-center gap-2 min-w-0 max-w-full bg-muted/40 px-3 py-1.5 rounded-full border border-border/50">
                    <img 
                      src={
                        session.therapistAvatarUrl && !session.therapistAvatarUrl.includes('photo-1559839734')
                          ? session.therapistAvatarUrl 
                          : "https://res.cloudinary.com/ddgvdabyf/image/upload/v1766954534/uploads/orwxj9dw0f2bnj5cgxex.webp"
                      } 
                      alt={session.therapistName} 
                      className="w-8 h-8 shrink-0 rounded-full object-cover border border-primary/20" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://res.cloudinary.com/ddgvdabyf/image/upload/v1766954534/uploads/orwxj9dw0f2bnj5cgxex.webp";
                      }}
                    />
                    <span className="font-semibold text-sm text-foreground truncate">
                      {session.therapistName?.includes(' - By ') 
                        ? session.therapistName.split(' - By ').pop()?.trim() 
                        : session.therapistName || 'Assigned Therapist'}
                    </span>
                  </div>
                  
                  {activeTab === 'upcoming' && !isUnscheduled(session) && !canChange(session.scheduledAt) && (
                    <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Less than {CHANGE_CUTOFF_HOURS} hours to go: it can no longer be cancelled or rescheduled
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
                        {canChange(session.scheduledAt) ? (
                          <>
                            <button
                              onClick={() => setRescheduleTarget(session)}
                              disabled={busyId === String(session.id)}
                              className="hex-button-outline flex-1 sm:flex-none gap-2 text-sm cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className="w-4 h-4" /> Reschedule
                            </button>
                            <button
                              onClick={() => handleCancel(session.id)}
                              disabled={busyId === String(session.id)}
                              className="h-[48px] px-5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-center flex-1 sm:flex-none hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors text-sm gap-1.5 cursor-pointer border border-amber-200/60 dark:border-amber-800/40 disabled:opacity-50"
                              title="Cancel session"
                            >
                              <XCircle className="w-4 h-4" /> {busyId === String(session.id) ? 'Cancelling…' : 'Cancel'}
                            </button>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground max-w-[260px]">
                            Need to change this session? Message your therapist or contact us.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  {activeTab === 'past' && (
                    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                      {String(session.bookingStatus || '').toUpperCase() === 'COMPLETED' ? (
                        <div className="flex items-center gap-2 text-success font-medium bg-success-bg px-4 py-2 rounded-lg text-sm">
                          <CheckCircle2 className="w-4 h-4" /> {statusLabel(session.bookingStatus, 'Completed')}
                        </div>
                      ) : (
                        // Missed sessions and sessions whose time passed without being marked done are not shown as completed
                        <div className="flex items-center gap-2 text-amber-700 font-medium bg-amber-50 px-4 py-2 rounded-lg text-sm">
                          <AlertCircle className="w-4 h-4" /> {statusLabel(session.bookingStatus === 'CONFIRMED' || session.bookingStatus === 'RESCHEDULED' ? '' : session.bookingStatus, 'Awaiting session notes')}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsBookingOpen(true)}
                          className="px-4 py-2.5 sm:py-2 rounded-full bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Book Follow-up
                        </button>
                        <button
                          onClick={() => handleRemove(session.id)}
                          disabled={busyId === String(session.id)}
                          className="p-2.5 sm:p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Remove from your list"
                          aria-label="Remove from your list"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  {activeTab === 'cancelled' && (
                    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                      <div className="flex items-center gap-2 text-destructive font-medium bg-red-50 px-4 py-2 rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4" /> {statusLabel((session as any).bookingStatus, 'Cancelled')}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsBookingOpen(true)}
                          className="px-4 py-2.5 sm:py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Rebook Slot
                        </button>
                        <button
                          onClick={() => handleRemove(session.id)}
                          disabled={busyId === String(session.id)}
                          className="p-2.5 sm:p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Remove from your list"
                          aria-label="Remove from your list"
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
        isOpen={isBookingOpen || !!rescheduleTarget}
        onClose={() => {
          setIsBookingOpen(false);
          setRescheduleTarget(null);
        }}
        reschedule={rescheduleTarget ? { id: rescheduleTarget.id, currentAt: rescheduleTarget.scheduledAt } : undefined}
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
