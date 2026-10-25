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
  monthlyRevenue: number;
  databaseConnected?: string;
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

  updateBookingStatus: (bookingId: string, status: Booking['status']) => void;
  releasePayout: (payoutId: string) => void;
  verifyTherapist: (therapistId: string) => void;
  deleteTherapist: (therapistId: string) => Promise<void>;
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

/** YYYY-MM-DD in UTC, the same calendar the Backend uses for booking dates */
const todayIsoDate = () => new Date().toISOString().split('T')[0];

function isoDateOf(value: unknown): string {
  const d = new Date(value as any);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

function formatClientStatus(raw?: string): Client['status'] {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'completed') return 'Completed';
  if (['inactive', 'suspended', 'blocked', 'deleted', 'disabled'].includes(s)) return 'Inactive';
  return 'Active';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_bookings`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [therapists, setTherapists] = useState<Therapist[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_therapists`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_clients`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [payouts, setPayouts] = useState<TherapistPayout[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_payouts`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [activities, setActivities] = useState<Activity[]>([]);
  // Assessment instruments are defined in the Assessments page; the Backend serves submissions/assignments only
  const [assessments] = useState<ClinicalAssessment[]>([]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_auditLogs`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // Revenue figures computed by the Backend (/api/admin/revenue); null until loaded
  const [revenueStats, setRevenueStats] = useState<{ monthlyRevenue: number; revenueToday: number } | null>(null);

  const fetchWithFallback = async (endpoint: string) => {
    try {
      return await api.get(endpoint);
    } catch {
      return null;
    }
  };

  const refreshAllData = async () => {
    // 1. Fetch Users
    // A list the API returns (even empty) replaces the cached copy; the cache is kept only on network errors
    fetchWithFallback("/api/admin/users").then((data) => {
      if (data?.users && Array.isArray(data.users)) {
        const liveClients: Client[] = data.users
          // Therapist and admin accounts are not clients
          .filter((u: any) => !["ADMIN", "SUPER_ADMIN", "CONSULTANT", "THERAPIST"].includes(String(u.role || "").toUpperCase()))
          .map((u: any) => ({
          id: u.id || String(u._id),
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
        try {
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_clients`, JSON.stringify(liveClients));
        } catch {}
      }
    });

    // 2. Fetch Consultants
    fetchWithFallback("/api/admin/consultants").then((data) => {
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
          profession: c.profession || c.title || "Clinical Specialist",
          professionId: c.professionId ? String(c.professionId) : undefined,
          rating: c.rating !== undefined ? Number(c.rating) : 5.0,
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
          outcomes: c.outcomes || {
            clientImprovementScore: 92,
            goalAchievementRate: 88,
            homeworkAdherenceRate: 90,
            attendanceRate: 96
          }
        }));
        setTherapists(liveTherapists);
        try {
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_therapists`, JSON.stringify(liveTherapists));
        } catch {}
      }
    });

    // 3. Fetch Bookings (display values are derived here and never written back)
    fetchWithFallback("/api/admin/bookings").then((data) => {
      if (data?.bookings && Array.isArray(data.bookings)) {
        const liveBookings: Booking[] = data.bookings.map((b: any) => {
          // Website bookings can arrive without a session time; they are scheduled later
          const toBeScheduled = Boolean(b.toBeScheduled) || (!b.date && !b.scheduledAt && !b.sessionDate);
          const rawAmount = Number(b.amount ?? b.price ?? b.fee);

          return {
            id: b.id || String(b._id),
            bookingCode: b.bookingCode || `HEX-${String(b.id || b._id).slice(-6).toUpperCase()}`,
            clientName: b.clientName || "Client User",
            clientId: b.clientId || b.userId || undefined,
            clientEmail: b.clientEmail || undefined,
            clientAvatar: b.clientAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
            consultantId: b.consultantId || b.therapistId || undefined,
            therapistName: b.therapistName || b.consultantName || "Specialist",
            therapistAvatar: b.therapistAvatar || b.consultantAvatar || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100",
            therapistProfession: b.therapistProfession || b.profession || b.consultantProfession || "Clinical Specialist",
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
          };
        });
        setBookings(liveBookings);
        try {
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_bookings`, JSON.stringify(liveBookings));
        } catch {}
      }
    });

    // 4. Fetch Payouts
    fetchWithFallback("/api/admin/payouts").then((data) => {
      if (data?.payouts && Array.isArray(data.payouts)) {
        setPayouts(data.payouts);
        try {
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_payouts`, JSON.stringify(data.payouts));
        } catch {}
      }
    });

    // 5. Fetch Activities
    fetchWithFallback("/api/admin/activities").then((data) => {
      if (data?.activities && Array.isArray(data.activities)) {
        setActivities(data.activities);
      }
    });

    // 6. Revenue figures (paid bookings only, net of refunds) computed by the Backend
    fetchWithFallback("/api/admin/revenue").then((data) => {
      if (!data || !Array.isArray(data.monthlyAnalytics)) return;
      const currentMonth = data.monthlyAnalytics[data.monthlyAnalytics.length - 1];
      const today = todayIsoDate();
      const revenueToday = (Array.isArray(data.transactions) ? data.transactions : [])
        .filter((t: any) => t.status === 'paid' && t.date === today)
        .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);
      setRevenueStats({ monthlyRevenue: Number(currentMonth?.revenue) || 0, revenueToday });
    });

    // 7. Fetch Audit Logs
    fetchWithFallback("/api/admin/logs?limit=100").then((data) => {
      if (data?.logs && Array.isArray(data.logs)) {
        setAuditLogs(data.logs);
        try {
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_auditLogs`, JSON.stringify(data.logs));
        } catch {}
      }
    });
  };

  // Fetch live MongoDB Atlas data on mount
  useEffect(() => {
    refreshAllData();
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_bookings`, JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_therapists`, JSON.stringify(therapists));
  }, [therapists]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_clients`, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_payouts`, JSON.stringify(payouts));
  }, [payouts]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_auditLogs`, JSON.stringify(auditLogs));
  }, [auditLogs]);

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
    const activeClientsCount = clients.length;
    const pendingReportsCount = completedBookings.length;

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

    return {
      sessionsTodayCount,
      activeClientsCount,
      pendingReportsCount,
      therapyHoursToday,
      activeTherapistsCount,
      revenueToday,
      pendingPayoutsAmount: Math.round(pendingPayoutsAmount),
      pendingPayoutsTherapistsCount,
      monthlyRevenue,
      databaseConnected: "MongoDB Atlas (Connected)",
    };
  };

  const updateBookingStatus = (bookingId: string, status: Booking['status']) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
    );
    addAuditLog(`Booking #${bookingId} set to ${status}`, 'Bookings');

    // Persist to MongoDB Atlas
    // Only the status is written, as the canonical value the website and panels use
    api.put(`/api/admin/bookings/${bookingId}`, { status: BOOKING_STATUS_CANONICAL[status] || status.toUpperCase() }).catch((err) => {
      console.error('Error updating booking status in DB:', err);
    });
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

  const verifyTherapist = (therapistId: string) => {
    setTherapists((prev) =>
      prev.map((t) =>
        t.id === therapistId ? { ...t, verificationStatus: 'Verified' as const } : t
      )
    );
    addAuditLog(`Verified Therapist ID #${therapistId}`, 'Therapists');

    // Persist to MongoDB Atlas
    api.put(`/api/admin/consultants/${therapistId}`, { verificationStatus: 'Verified', isCertified: true }).catch((err) => {
      console.error('Error verifying therapist in DB:', err);
    });
  };

  const deleteTherapist = async (therapistId: string) => {
    const target = therapists.find((t) => t.id === therapistId);
    const updated = therapists.filter((t) => t.id !== therapistId);
    setTherapists(updated);
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_therapists`, JSON.stringify(updated));
    } catch {}

    if (target) {
      addAuditLog(`Deleted Consultant ${target.name} (ID: ${therapistId})`, 'Therapists');
    }

    try {
      await api.delete(`/api/admin/consultants?id=${encodeURIComponent(therapistId)}`);
    } catch (err) {
      console.error('Error deleting therapist from DB:', err);
      // Fallback try /api/consultants
      await api.delete(`/api/consultants?id=${encodeURIComponent(therapistId)}`).catch(() => {});
    }
  };

  const assignClientTherapist = async (
    clientId: string,
    therapistId: string,
    therapistName: string,
    therapistEmail?: string,
    therapistPhoto?: string
  ) => {
    // 1. Immediately update state so client is assigned exclusively to this single therapist
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

    // 2. Persist to MongoDB Atlas via Backend API
    try {
      await api.put(`/api/admin/users/${clientId}`, {
        assignedTherapistId: therapistId,
        assignedTherapistName: therapistName,
        assignedTherapistEmail: therapistEmail,
        assignedTherapistPhoto: therapistPhoto,
      });
    } catch (err) {
      console.error('Error assigning client therapist in DB:', err);
      try {
        await api.put(`/api/users/${clientId}`, {
          assignedTherapistId: therapistId,
          assignedTherapistName: therapistName,
          assignedTherapistEmail: therapistEmail,
          assignedTherapistPhoto: therapistPhoto,
        });
      } catch {}
    }

    // Refresh data in background to sync state across panels
    refreshAllData();
  };

  const addAuditLog = (action: string, moduleName: string, role = 'Super Admin') => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      user: 'Super Administrator',
      role,
      action,
      module: moduleName,
      severity: 'INFO',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ipAddress: '127.0.0.1'
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    // Persist to MongoDB Atlas
    api.post('/api/admin/logs', newLog).catch((err) => {
      console.warn('Could not persist audit log to DB:', err);
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
        updateBookingStatus,
        releasePayout,
        verifyTherapist,
        deleteTherapist,
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
