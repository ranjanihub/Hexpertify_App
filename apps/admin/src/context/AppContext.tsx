import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { api } from '../lib/apiClient';
import type {
  Booking,
  TherapistPayout,
  Therapist,
  Client,
  Activity,
  ClinicalAssessment,
  AuditLog
} from '../types';

export interface DashboardMetrics {
  sessionsTodayCount: number;
  activeClientsCount: number;
  pendingReportsCount: number;
  therapyHoursToday: number;
  activeTherapistsCount: number;
  revenueToday: number;
  pendingPayoutsAmount: number;
  pendingPayoutsTherapistsCount: number;
  /** Completed, paid sessions not yet paid out to their therapist (from the payouts endpoint) */
  pendingPayoutSessionsCount: number;
  monthlyRevenue: number;
}

export interface AppContextType {
  bookings: Booking[];
  therapists: Therapist[];
  clients: Client[];
  payouts: TherapistPayout[];
  activities: Activity[];
  assessments: ClinicalAssessment[];
  auditLogs: AuditLog[];
  metrics: DashboardMetrics;
  /** Set when the last load could not reach the server (the lists then show what was loaded before, if anything) */
  dataError: string | null;
  /** True once the first load has finished (successfully or not) */
  dataLoaded: boolean;

  /** Saves the status on the server first; the list changes only after it succeeds (errors are thrown) */
  updateBookingStatus: (bookingId: string, status: Booking['status']) => Promise<void>;
  releasePayout: (payoutId: string) => void;
  deleteTherapist: (therapistId: string) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  assignClientTherapist: (clientId: string, therapistId: string, therapistName: string, therapistEmail?: string, therapistPhoto?: string) => Promise<void>;
  addAuditLog: (action: string, moduleName: string, role?: string) => void;
  refreshAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'hexpertify_admin_state_v1';

/** Maps backend payment statuses (PAID, REFUND_PENDING, ...) to the labels used across the admin UI */
const PAYMENT_STATUS_LABELS: Record<string, Booking['paymentStatus']> = {
  PAID: 'Paid',
  PENDING: 'Pending',
  FAILED: 'Failed',
  EXPIRED: 'Failed',
  UNPAID: 'Unpaid',
  REFUND_PENDING: 'Refund Pending',
  PARTIALLY_REFUNDED: 'Partially Refunded',
  REFUNDED: 'Refunded',
  'PENDING PAYOUT': 'Pending Payout',
};

function formatPaymentStatus(raw?: string): Booking['paymentStatus'] {
  // No recorded payment is not a payment
  if (!raw) return 'Unpaid';
  return PAYMENT_STATUS_LABELS[String(raw).toUpperCase()] || (raw as Booking['paymentStatus']);
}

/** Canonical booking statuses (Backend/website) → the labels shown across the admin UI */
const BOOKING_STATUS_LABELS: Record<string, Booking['status']> = {
  CONFIRMED: 'Scheduled',
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  RESCHEDULED: 'Rescheduled',
  NO_SHOW_CLIENT: 'No Show - Client',
  NO_SHOW_CONSULTANT: 'No Show - Consultant',
  NO_SHOW_THERAPIST: 'No Show - Consultant',
  PENDING: 'Pending',
  PENDING_PAYMENT: 'Pending Payment',
  EXPIRED: 'Expired',
};

/** Admin UI label → canonical status sent to the Backend */
const BOOKING_STATUS_CANONICAL: Record<string, string> = {
  Scheduled: 'CONFIRMED',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
  Rescheduled: 'RESCHEDULED',
  'No Show - Client': 'NO_SHOW_CLIENT',
  'No Show - Consultant': 'NO_SHOW_CONSULTANT',
  Pending: 'PENDING',
  'Pending Payment': 'PENDING_PAYMENT',
  Expired: 'EXPIRED',
};

function formatBookingStatus(raw?: string): Booking['status'] {
  const key = String(raw || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!key) return 'Scheduled';
  return BOOKING_STATUS_LABELS[key] || 'Scheduled';
}

/** Payment states that count as collected revenue */
const PAID_LABELS = new Set<Booking['paymentStatus']>(['Paid', 'Partially Refunded', 'Refund Pending']);

/** YYYY-MM-DD of a moment in India time (sessions and booking dates are India-time days) */
function istDay(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** Today in India time, whatever the admin's computer clock zone is */
const todayIsoDate = () => istDay(new Date());

function isoDateOf(value: unknown): string {
  const d = new Date(value as any);
  return isNaN(d.getTime()) ? '' : istDay(d);
}

function formatClientStatus(raw?: string): Client['status'] {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'completed') return 'Completed';
  if (['inactive', 'suspended', 'blocked', 'deleted', 'disabled'].includes(s)) return 'Inactive';
  return 'Active';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lists are loaded from the server each time; nothing with client data is kept in this browser between visits
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [payouts, setPayouts] = useState<TherapistPayout[]>([]);

  const [activities, setActivities] = useState<Activity[]>([]);
  // Assessment instruments are defined in the Assessments page; the Backend serves submissions/assignments only
  const [assessments] = useState<ClinicalAssessment[]>([]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Revenue figures computed by the Backend (/api/admin/revenue); null until loaded
  const [revenueStats, setRevenueStats] = useState<{ monthlyRevenue: number; revenueToday: number } | null>(null);

  const [dataError, setDataError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Copies older versions of the panel cached in this browser (names, emails, phones) are removed
  useEffect(() => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(LOCAL_STORAGE_KEY))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
  }, []);

  /**
   * GET that never throws: the data, or null when the request failed. A failure is remembered so the panel can
   * say the server couldn't be reached instead of passing old lists off as live. A 401 is not handled here:
   * the fetch wrapper (lib/api-auth.ts) asks the server whether the sign-in ended and the panel then signs out.
   */
  const failures = React.useRef(new Set<string>());
  const fetchWithFallback = async (endpoint: string) => {
    try {
      const data = await api.get(endpoint);
      failures.current.delete(endpoint);
      return data;
    } catch (err: any) {
      failures.current.add(endpoint);
      console.warn('[admin] could not load', endpoint, err?.message || err);
      return null;
    }
  };

  const refreshAllData = async () => {
    const pending: Promise<unknown>[] = [];
    const load = (endpoint: string) => {
      const p = fetchWithFallback(endpoint);
      pending.push(p);
      return p;
    };
    // 1. Fetch Users (a list the API returns, even empty, replaces what is shown)
    load("/api/admin/users").then((data) => {
      if (data?.users && Array.isArray(data.users)) {
        const liveClients: Client[] = data.users
          // Therapist and admin accounts are not clients
          .filter((u: any) => !["ADMIN", "SUPER_ADMIN", "CONSULTANT", "THERAPIST"].includes(String(u.role || "").toUpperCase()))
          .map((u: any) => ({
          id: u.id || String(u._id),
          clientNumber: u.clientNumber || undefined,
          name: u.name || u.email?.split("@")[0] || "Client",
          email: u.email || "",
          avatar: u.image || u.avatarUrl || undefined,
          avatarUrl: u.image || u.avatarUrl || undefined,
          phone: u.phoneNumber || u.phone || "",
          status: formatClientStatus(u.status),
          assignedTherapistId: u.assignedTherapistId || undefined,
          assignedTherapistName: u.assignedTherapistName || "",
          service: u.service || "",
          // Session dates and counts are filled from the bookings list when the user record has none
          lastSession: u.lastSession || "",
          lastSessionDate: u.lastSession || "",
          nextSession: u.nextSession || "",
          nextSessionDate: u.nextSession || "",
          totalSessionsCount: typeof u.totalSessionsCount === "number" ? u.totalSessionsCount : undefined,
          completedSessionsCount: typeof u.completedSessionsCount === "number" ? u.completedSessionsCount : undefined,
          attendanceRate: typeof u.attendanceRate === "number" ? u.attendanceRate : undefined,
          activePlanName: u.activePlanName || undefined,
          riskLevel: u.riskLevel || undefined,
          joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "",
          city: u.city || undefined,
          emergencyContactName: u.emergencyContactName || undefined,
          emergencyContactPhone: u.emergencyContactPhone || undefined,
          preferredLanguage: u.preferredLanguage || undefined,
          gender: u.gender || undefined,
          age: typeof u.age === "number" ? u.age : undefined,
          primaryConcern: u.primaryConcern || undefined,
          outstandingBalance: typeof u.outstandingBalance === "number" ? u.outstandingBalance : undefined,
          aiIntakeSummary: u.aiIntakeSummary || "",
          intakeResponses: u.intakeResponses || {},
          assessmentScores: u.assessmentScores || [],
          therapyGoals: u.therapyGoals || [],
          goals: u.goals || [],
          moodScores: u.moodScores || [],
          moodLogs: u.moodLogs || [],
          homeworkAssigned: u.homeworkAssigned || [],
          homework: u.homework || [],
          sessionHistory: u.sessionHistory || [],
          sessions: u.sessions || [],
          documents: u.documents || [],
          // Set by the backend: clinical details are visible only to the assigned therapist
          detailsRestricted: Boolean(u.detailsRestricted)
        }));
        setClients(liveClients);
      }
    });

    // 2. Fetch Consultants
    load("/api/admin/consultants").then((data) => {
      if (data?.consultants && Array.isArray(data.consultants)) {
        const liveTherapists: Therapist[] = data.consultants.map((c: any) => ({
          id: c.id || String(c._id),
          name: c.name || "Consultant",
          email: c.email || "",
          identifier: c.identifier || (c.name || "consultant").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          sequence: typeof c.sequence === "number" ? c.sequence : undefined,
          notificationTitle: c.notificationTitle || undefined,
          photo: c.photoUrl || c.photo || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
          photoAltText: c.photoAltText || `certified therapist ${c.name}`,
          profession: c.profession || c.title || "Specialist",
          professionId: c.professionId ? String(c.professionId) : undefined,
          // 0 = no reviews yet (never an unearned 5.0)
          rating: Number(c.rating) || 0,
          reviewCount: c.reviewCount !== undefined ? Number(c.reviewCount) : 0,
          activeClientsCount: c.activeClientsCount !== undefined ? Number(c.activeClientsCount) : 0,
          verificationStatus: (c.verificationStatus as any) || (c.isCertified !== false ? "Verified" : "Pending"),
          accountStatus: (c.accountStatus as any) || "Active",
          qualifications: c.qualifications || [],
          certificates: c.certificates || [],
          experienceYears: c.experienceYears !== undefined ? Number(c.experienceYears) : (c.experience !== undefined ? Number(c.experience) : 0),
          clientsServed: c.clientsServed !== undefined ? Number(c.clientsServed) : (c.clientCount !== undefined ? Number(c.clientCount) : 0),
          isCertified: c.isCertified !== false,
          youtubeUrl: c.youtubeUrl || "",
          languages: c.languages || ["English"],
          bio: c.bio || c.about || "",
          about: c.about || c.bio || "",
          specializations: c.specializations || c.specialties || [],
          licenseNumber: c.licenseNumber || "",
          platformFeePerSession: c.platformFeePerSession !== undefined ? Number(c.platformFeePerSession) : (c.minPrice || 500),
          platformFeeType: c.platformFeeType || "Fixed",
          totalRevenue: c.totalRevenue !== undefined ? Number(c.totalRevenue) : 0,
          therapyHours: c.therapyHours !== undefined ? Number(c.therapyHours) : 0,
          totalSessions: c.totalSessions !== undefined ? Number(c.totalSessions) : 0,
          services: c.services || [],
          reviews: c.reviews || [],
          faqs: c.faqs || [],
          seo: c.seo || undefined,
          bankName: c.bankName || undefined,
          bankAccountNumber: c.bankAccountNumber || undefined,
          bankIfsc: c.bankIfsc || undefined,
          accountHolderName: c.accountHolderName || undefined,
          upiId: c.upiId || undefined,
          isHiddenFromLive: Boolean(c.isHiddenFromLive),
          isBookingGreyedOut: Boolean(c.isBookingGreyedOut),
          isArchived: Boolean(c.isArchived),
          availability: c.availability,
          assignedClientIds: Array.isArray(c.assignedClientIds) ? c.assignedClientIds : [],
          // No invented outcome scores: the therapist profile loads real ones from the API
          outcomes: c.outcomes || undefined
        }));
        setTherapists(liveTherapists);
      }
    });

    // 3. Fetch Bookings (display values are derived here and never written back)
    load("/api/admin/bookings").then((data) => {
      if (data?.bookings && Array.isArray(data.bookings)) {
        const liveBookings: Booking[] = data.bookings.map((b: any) => {
          // Website bookings can arrive without a session time; they are scheduled later
          const toBeScheduled = Boolean(b.toBeScheduled) || (!b.date && !b.scheduledAt && !b.sessionDate);
          const rawAmount = Number(b.amount ?? b.price ?? b.fee);

          return {
            id: b.id || String(b._id),
            bookingCode: b.bookingNumber || b.bookingCode || `HEX-${String(b.id || b._id).slice(-6).toUpperCase()}`,
            clientName: b.clientName || "Client User",
            clientId: b.clientId || b.userId || undefined,
            clientEmail: b.clientEmail || undefined,
            clientAvatar: b.clientAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
            consultantId: b.consultantId || b.therapistId || undefined,
            therapistName: b.therapistName || b.consultantName || "Specialist",
            therapistAvatar: b.therapistAvatar || b.consultantAvatar || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100",
            // No made-up fallback: the Bookings page looks the therapist up by id, else shows "Consultant"
            therapistProfession: b.therapistProfession || b.profession || b.consultantProfession || undefined,
            service: b.serviceTitle || b.service || "1-on-1 Consultation",
            date: toBeScheduled
              ? "To be scheduled"
              : b.date || isoDateOf(b.scheduledAt || b.sessionDate),
            time: toBeScheduled ? "" : b.time || "",
            toBeScheduled,
            duration: b.duration ? String(b.duration) : `${b.durationMinutes || 50} mins`,
            durationMinutes: Number(b.durationMinutes) || undefined,
            sessionType: "Individual" as const,
            status: formatBookingStatus(b.status),
            amount: Number.isFinite(rawAmount) ? rawAmount : 0,
            paymentStatus: formatPaymentStatus(b.paymentStatus),
            paymentId: b.paymentId,
            channel: "Video Call (Google Meet)" as const,
            notes: b.notes || "",
            meetingUrl: b.meetingLink || b.meetingUrl || "",
            // The therapist has filed the session report (the dashboard counts completed sessions without one)
            hasSessionReport: Boolean(b.sessionReportSubmittedAt || b.sessionReport),
          };
        });
        setBookings(liveBookings);
      }
    });

    // 4. Fetch Payouts
    load("/api/admin/payouts").then((data) => {
      if (data?.payouts && Array.isArray(data.payouts)) {
        setPayouts(data.payouts);
      }
    });

    // 5. Fetch Activities
    load("/api/admin/activities").then((data) => {
      if (data?.activities && Array.isArray(data.activities)) {
        setActivities(data.activities);
      }
    });

    // 6. Revenue figures (paid bookings only, net of refunds) computed by the Backend
    load("/api/admin/revenue").then((data) => {
      if (!data || !Array.isArray(data.monthlyAnalytics)) return;
      const currentMonth = data.monthlyAnalytics[data.monthlyAnalytics.length - 1];
      const today = todayIsoDate();
      const revenueToday = (Array.isArray(data.transactions) ? data.transactions : [])
        .filter((t: any) => t.status === 'paid' && t.date === today)
        .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);
      setRevenueStats({ monthlyRevenue: Number(currentMonth?.revenue) || 0, revenueToday });
    });

    // 7. Fetch Audit Logs
    load("/api/admin/logs?limit=100").then((data) => {
      if (data?.logs && Array.isArray(data.logs)) {
        setAuditLogs(data.logs);
      }
    });

    // The core lists decide whether the panel says the server could not be reached
    await Promise.allSettled(pending);
    const core = ['/api/admin/users', '/api/admin/consultants', '/api/admin/bookings', '/api/admin/payouts'];
    const failed = core.filter((e) => failures.current.has(e));
    setDataError(
      failed.length
        ? 'Could not reach the server, so some lists may be missing or out of date. Check your connection and use Retry.'
        : null
    );
    setDataLoaded(true);
  };

  // Load the live data on mount
  useEffect(() => {
    refreshAllData();
  }, []);

  // Session counts and last/next session dates from the client's real bookings, when the user record has none
  const clientsWithSessions = useMemo<Client[]>(() => {
    const today = todayIsoDate();
    return clients.map((c) => {
      const email = (c.email || '').toLowerCase();
      const mine = bookings.filter(
        (b) => (b.clientId && b.clientId === c.id) || (email && (b.clientEmail || '').toLowerCase() === email)
      );
      const dated = mine.filter((b) => !b.toBeScheduled && /^\d{4}-\d{2}-\d{2}$/.test(b.date));
      const completed = mine.filter((b) => b.status === 'Completed');
      const last = dated
        .filter((b) => b.status === 'Completed')
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const next = dated
        .filter((b) => (b.status === 'Scheduled' || b.status === 'Rescheduled') && b.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      const fmt = (b?: Booking) => (b ? `${b.date}${b.time ? `, ${b.time}` : ''}` : '');
      return {
        ...c,
        totalSessionsCount: c.totalSessionsCount ?? mine.length,
        completedSessionsCount: c.completedSessionsCount ?? completed.length,
        lastSession: c.lastSession || fmt(last),
        lastSessionDate: c.lastSessionDate || fmt(last),
        nextSession: c.nextSession || fmt(next),
        nextSessionDate: c.nextSessionDate || fmt(next),
      };
    });
  }, [clients, bookings]);

  // Derived metrics calculation directly from real live state
  const getMetrics = (): DashboardMetrics => {
    const today = todayIsoDate();
    const completedBookings = bookings.filter((b) => b.status === 'Completed');
    const todaysBookings = bookings.filter(
      (b) => !b.toBeScheduled && b.date === today && !['Cancelled', 'Expired', 'Pending Payment'].includes(b.status)
    );

    const sessionsTodayCount = todaysBookings.length;
    // Client accounts that are not switched off (Inactive)
    const activeClientsCount = clients.filter((c) => c.status !== 'Inactive').length;
    // Completed sessions whose therapist has not filed the session report yet
    const pendingReportsCount = completedBookings.filter((b) => !b.hasSessionReport).length;

    const therapyHoursToday = Math.round(
      todaysBookings.reduce((acc, b) => {
        const mins = parseInt(b.duration || '50', 10);
        return acc + (isNaN(mins) ? 50 : mins);
      }, 0) / 60
    );

    const activeTherapistsCount = therapists.length;
    // Backend revenue figures when available; otherwise today's/this month's paid bookings
    const isPaid = (b: Booking) => PAID_LABELS.has(b.paymentStatus) && b.status !== 'Cancelled';
    const revenueToday = revenueStats
      ? revenueStats.revenueToday
      : bookings.filter((b) => isPaid(b) && b.date === today).reduce((acc, b) => acc + (b.amount || 0), 0);
    const monthlyRevenue = revenueStats
      ? revenueStats.monthlyRevenue
      : bookings
          .filter((b) => isPaid(b) && b.date.slice(0, 7) === today.slice(0, 7))
          .reduce((acc, b) => acc + (b.amount || 0), 0);
    // Pending payouts as computed by the Backend payouts endpoint
    const pendingPayouts = payouts.filter((p) => Number(p.pendingAmount) > 0);
    const pendingPayoutsAmount = pendingPayouts.reduce((acc, p) => acc + Number(p.pendingAmount), 0);
    const pendingPayoutsTherapistsCount = pendingPayouts.length;
    const pendingPayoutSessionsCount = payouts.reduce(
      (acc, p: any) => acc + (Array.isArray(p.unpaidSessions) ? p.unpaidSessions.length : Number(p.sessionsCount) || 0),
      0
    );

    return {
      sessionsTodayCount,
      activeClientsCount,
      pendingReportsCount,
      therapyHoursToday,
      activeTherapistsCount,
      revenueToday,
      pendingPayoutsAmount: Math.round(pendingPayoutsAmount),
      pendingPayoutsTherapistsCount,
      pendingPayoutSessionsCount,
      monthlyRevenue,
    };
  };

  /**
   * Saves a booking's status on the server first (only the status, as the canonical value the website and panels
   * use); the list changes only after the server confirms, and a failure is thrown for the caller to show.
   * The server records the change in the audit log with the signed-in admin.
   */
  const updateBookingStatus = async (bookingId: string, status: Booking['status']) => {
    await api.put(`/api/admin/bookings/${encodeURIComponent(bookingId)}`, {
      status: BOOKING_STATUS_CANONICAL[status] || status.toUpperCase()
    });
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
    refreshAllData();
  };

  const releasePayout = (payoutId: string) => {
    setPayouts((prev) =>
      prev.map((p) =>
        p.id === payoutId ? { ...p, pendingAmount: 0, pendingReportsCount: 0 } : p
      )
    );
    addAuditLog(`Released Payout ID #${payoutId}`, 'Payments');

    // Persist to MongoDB Atlas
    api.put(`/api/admin/payouts/${payoutId}`, { status: 'RELEASED', pendingAmount: 0, pendingReportsCount: 0 }).catch((err) => {
      console.error('Error releasing payout in DB:', err);
    });
  };

  /**
   * Deletes a therapist on the server first; only a real delete removes them here and is audit-logged.
   * The server refuses therapists with bookings (so booking history stays intact) and that error is passed on.
   */
  const deleteTherapist = async (therapistId: string) => {
    const target = therapists.find((t) => t.id === therapistId);
    await api.delete(`/api/admin/consultants?id=${encodeURIComponent(therapistId)}`);

    setTherapists((prev) => prev.filter((t) => t.id !== therapistId));
    if (target) {
      addAuditLog(`Deleted Consultant ${target.name} (ID: ${therapistId})`, 'Therapists');
    }
  };

  /**
   * Deletes a client account on the server first; only a real delete removes them here and is audit-logged.
   * The server refuses clients with upcoming sessions and that error is passed on.
   */
  const deleteClient = async (clientId: string) => {
    const target = clients.find((c) => c.id === clientId);
    const params = new URLSearchParams({ id: clientId });
    if (target?.email) params.set('email', target.email);
    await api.delete(`/api/admin/users?${params.toString()}`);

    setClients((prev) => prev.filter((c) => c.id !== clientId));
    if (target) {
      addAuditLog(`Deleted Client ${target.name} (${target.clientNumber || target.id})`, 'Clients');
    }
    refreshAllData();
  };

  const assignClientTherapist = async (
    clientId: string,
    therapistId: string,
    therapistName: string,
    therapistEmail?: string,
    therapistPhoto?: string
  ) => {
    // Saved on the server first; a failure is passed on (no retry elsewhere, nothing shown or logged as done)
    await api.put(`/api/admin/users/${clientId}`, {
      assignedTherapistId: therapistId,
      assignedTherapistName: therapistName,
      assignedTherapistEmail: therapistEmail,
      assignedTherapistPhoto: therapistPhoto,
    });

    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? {
              ...c,
              assignedTherapistId: therapistId,
              assignedTherapistName: therapistName,
            }
          : c
      )
    );
    addAuditLog(`Assigned Client #${clientId} exclusively to Consultant ${therapistName}`, 'Clients');

    // Refresh data in background to sync state across panels
    refreshAllData();
  };

  /**
   * Adds a readable description of an admin action to the audit log. The server fills in who did it (from the
   * signed-in token), the IP and the time; nothing about the person is sent from here. The list is reloaded from
   * the server afterwards, so only entries the server stored are shown. (The `role` argument is ignored.)
   */
  const addAuditLog = (action: string, moduleName: string, _role?: string) => {
    const severity = /\b(delet|refund|payout)/i.test(action) ? 'CRITICAL' : /\b(cancel|suspend|deactivat)/i.test(action) ? 'WARNING' : 'INFO';
    api
      .post('/api/admin/logs', { action, module: moduleName, severity })
      .then(() => api.get('/api/admin/logs?limit=100'))
      .then((data: any) => {
        if (Array.isArray(data?.logs)) setAuditLogs(data.logs);
      })
      .catch((err) => {
        console.warn('Could not record the audit entry:', err?.message || err);
      });
  };

  return (
    <AppContext.Provider
      value={{
        bookings,
        therapists,
        clients: clientsWithSessions,
        payouts,
        activities,
        assessments,
        auditLogs,
        metrics: getMetrics(),
        dataError,
        dataLoaded,
        updateBookingStatus,
        releasePayout,
        deleteTherapist,
        deleteClient,
        assignClientTherapist,
        addAuditLog,
        refreshAllData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
