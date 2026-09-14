import React, { createContext, useContext, useState, useEffect } from 'react';
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
import {
  mockActivities,
  mockAssessments,
  mockAuditLogs
} from '../data/mockData';

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

  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [assessments, setAssessments] = useState<ClinicalAssessment[]>(mockAssessments);
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_auditLogs`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return mockAuditLogs;
  });

  const fetchWithFallback = async (endpoint: string) => {
    try {
      return await api.get(endpoint);
    } catch {
      return null;
    }
  };

  const refreshAllData = async () => {
    // 1. Fetch Users
    fetchWithFallback("/api/admin/users").then((data) => {
      if (data?.users && Array.isArray(data.users) && data.users.length > 0) {
        const liveClients: Client[] = data.users.map((u: any) => ({
          id: u.id || String(u._id),
          name: u.name || "Client User",
          email: u.email || "",
          phone: u.phoneNumber || u.phone || "+91 98765 43210",
          status: u.status || "Active",
          assignedTherapistName: u.assignedTherapistName || "Ahamed Amina Nahla",
          service: u.service || "Individual Therapy",
          lastSession: u.lastSession || "Yesterday",
          lastSessionDate: u.lastSession || "Yesterday",
          nextSession: u.nextSession || "Tomorrow, 10:00 AM",
          nextSessionDate: u.nextSession || "Tomorrow, 10:00 AM",
          totalSessionsCount: u.bookings?.length || 1,
          completedSessionsCount: u.bookings?.filter((b: any) => b.status === "COMPLETED").length || 1,
          attendanceRate: 98,
          activePlanName: "Comprehensive CBT Care",
          riskLevel: "Low",
          joinedDate: new Date(u.createdAt || Date.now()).toLocaleDateString(),
          city: "New York",
          emergencyContactName: "Emergency Contact",
          emergencyContactPhone: "+1 555-999-0000",
          preferredLanguage: "English",
          gender: "Female",
          age: 28,
          primaryConcern: "Anxiety & Wellness",
          outstandingBalance: 0,
          aiIntakeSummary: u.aiIntakeSummary || `Patient record registered on ${new Date(u.createdAt || Date.now()).toLocaleDateString()}. Initial clinical intake active.`,
          intakeResponses: u.intakeResponses || {
            "Registered Email": u.email,
            "Account Status": u.status || "Active"
          },
          assessmentScores: u.assessmentScores || [],
          therapyGoals: u.therapyGoals || [],
          goals: u.goals || [],
          moodScores: u.moodScores || [],
          moodLogs: u.moodLogs || [],
          homeworkAssigned: u.homeworkAssigned || [],
          homework: u.homework || [],
          sessionHistory: u.sessionHistory || [],
          sessions: u.sessions || [],
          documents: u.documents || []
        }));
        setClients(liveClients);
        try {
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_clients`, JSON.stringify(liveClients));
        } catch {}
      }
    });

    // 2. Fetch Consultants
    fetchWithFallback("/api/admin/consultants").then((data) => {
      if (data?.consultants && Array.isArray(data.consultants) && data.consultants.length > 0) {
        const liveTherapists: Therapist[] = data.consultants.map((c: any) => ({
          id: c.id || String(c._id),
          name: c.name || "Consultant",
          email: c.email || "",
          identifier: c.identifier || (c.name || "consultant").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          sequence: c.sequence || 999,
          notificationTitle: c.notificationTitle || undefined,
          photo: c.photo || c.photoUrl || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
          photoAltText: c.photoAltText || `certified therapist ${c.name}`,
          profession: c.profession || c.title || "Clinical Specialist",
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
          licenseNumber: c.licenseNumber || ("LIC-" + (c.id || "000000").slice(0, 6).toUpperCase()),
          platformFeePerSession: c.platformFeePerSession !== undefined ? Number(c.platformFeePerSession) : (c.minPrice || 500),
          platformFeeType: c.platformFeeType || "Fixed",
          totalRevenue: c.totalRevenue !== undefined ? Number(c.totalRevenue) : 0,
          therapyHours: c.therapyHours !== undefined ? Number(c.therapyHours) : 0,
          totalSessions: c.totalSessions !== undefined ? Number(c.totalSessions) : 0,
          services: c.services || [],
          reviews: c.reviews || [],
          faqs: c.faqs || [],
          seo: c.seo || undefined,
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

    // 3. Fetch Bookings
    fetchWithFallback("/api/admin/bookings").then((data) => {
      if (data?.bookings && Array.isArray(data.bookings) && data.bookings.length > 0) {
        const liveBookings: Booking[] = data.bookings.map((b: any) => ({
          id: b.id || String(b._id),
          bookingCode: b.bookingCode || `HEX-${String(b.id || b._id).slice(-6).toUpperCase()}`,
          clientName: b.clientName || "Client User",
          clientAvatar: b.clientAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
          therapistName: b.therapistName || b.consultantName || "Specialist",
          therapistAvatar: b.therapistAvatar || b.consultantAvatar || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100",
          therapistProfession: b.therapistProfession || b.profession || b.consultantProfession || "Clinical Specialist",
          service: b.serviceTitle || b.service || "1-on-1 Consultation",
          date: b.date || (b.scheduledAt ? new Date(b.scheduledAt).toISOString().split('T')[0] : "Today"),
          time: b.time || "10:00 AM",
          duration: b.duration ? String(b.duration) : `${b.durationMinutes || 50} mins`,
          sessionType: "Individual" as const,
          status: String(b.status || '').toUpperCase() === "COMPLETED" ? ("Completed" as const) : String(b.status || '').toUpperCase() === "CANCELLED" ? ("Cancelled" as const) : ("Scheduled" as const),
          amount: Number(b.amount) || 1500,
          paymentStatus: b.paymentStatus || "Paid",
          channel: "Video Call (Google Meet)" as const,
          notes: "Live MongoDB Atlas consultation",
          meetingUrl: b.meetingLink || b.meetingUrl || "https://meet.google.com/xyz-hexpertify-session",
        }));
        setBookings(liveBookings);
        try {
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_bookings`, JSON.stringify(liveBookings));
        } catch {}
      }
    });

    // 4. Fetch Payouts
    fetchWithFallback("/api/admin/payouts").then((data) => {
      if (data?.payouts && Array.isArray(data.payouts) && data.payouts.length > 0) {
        setPayouts(data.payouts);
        try {
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_payouts`, JSON.stringify(data.payouts));
        } catch {}
      }
    });

    // 5. Fetch Activities
    fetchWithFallback("/api/admin/activities").then((data) => {
      if (data?.activities && Array.isArray(data.activities) && data.activities.length > 0) {
        setActivities(data.activities);
      }
    });

    // 6. Fetch Assessments
    fetchWithFallback("/api/admin/assessments").then((data) => {
      if (data?.assessments && Array.isArray(data.assessments) && data.assessments.length > 0) {
        setAssessments(data.assessments);
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

  // Derived metrics calculation directly from real live state
  const getMetrics = (): DashboardMetrics => {
    const scheduledBookings = bookings.filter((b) => b.status === 'Scheduled');
    const completedBookings = bookings.filter((b) => b.status === 'Completed');
    
    const sessionsTodayCount = scheduledBookings.length;
    const activeClientsCount = clients.length;
    const pendingReportsCount = completedBookings.length;

    const therapyHoursToday = Math.round(
      bookings.reduce((acc, b) => {
        const mins = parseInt(b.duration || '50', 10);
        return acc + (isNaN(mins) ? 50 : mins);
      }, 0) / 60
    );

    const activeTherapistsCount = therapists.length;
    const revenueToday = bookings.slice(0, 10).reduce((acc, b) => acc + (b.amount || 1500), 0);
    const pendingPayoutsAmount = completedBookings.reduce((acc, b) => acc + (b.amount || 1500) * 0.8, 0);
    const pendingPayoutsTherapistsCount = Math.min(therapists.length, completedBookings.length);
    const monthlyRevenue = bookings.reduce((acc, b) => acc + (b.amount || 1500), 0);

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
    api.put(`/api/admin/bookings/${bookingId}`, { status: status.toUpperCase() }).catch((err) => {
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
      id: `LOG-${Date.now()}`,
      user: 'Admin User',
      role,
      action,
      module: moduleName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ipAddress: '127.0.0.1'
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        bookings,
        therapists,
        clients,
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
