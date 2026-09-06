export type PageId =
  | 'dashboard'
  | 'bookings'
  | 'payments'
  | 'revenue'
  | 'therapists'
  | 'availability'
  | 'clients'
  | 'activities'
  | 'assessments'
  | 'assets'
  | 'professions'
  | 'resources'
  | 'homepage'
  | 'zombi'
  | 'settings';

export type ResourceType = 'article' | 'worksheet' | 'meditation' | 'video' | 'pdf';

export interface ResourceItem {
  id: string;
  type: ResourceType;
  typeLabel: string;
  category: 'Articles' | 'Worksheets' | 'Meditations' | 'Videos' | 'PDFs' | string;
  isRecommended: boolean;
  title: string;
  description: string;
  fullContent?: string;
  duration: string;
  imageUrl: string;
  tags: string[];
  isSaved?: boolean;
  externalUrl?: string;
  createdAt?: string;
}


export interface KPIItem {
  id: string;
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean | null;
  icon: string;
  subtitle?: string;
}

export interface Booking {
  id: string;
  bookingCode: string;
  clientName: string;
  clientAvatar?: string;
  therapistName: string;
  therapistAvatar?: string;
  therapistProfession?: string;
  service: string;
  date: string;
  time: string;
  duration: string;
  sessionType: 'Individual' | 'Couple' | 'Teen' | 'Family' | 'Career';
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'No Show - Client' | 'No Show - Consultant';
  amount: number;
  paymentStatus: 'Paid' | 'Pending Payout' | 'Refunded';
}

export interface SessionReport {
  id: string;
  sessionId: string;
  sessionDate: string;
  clientName: string;
  sessionFee: number;
  status: 'Pending Review' | 'Approved' | 'Paid';
  notes?: string;
}

export interface TherapistPayout {
  id: string;
  therapistId: string;
  therapistName: string;
  therapistAvatar: string;
  profession: string;
  pendingReportsCount: number;
  sessionsCount: number;
  lastSessionDate: string;
  pendingAmount: number;
  unpaidSessions: SessionReport[];
}

export interface TherapistServiceItem {
  id: string;
  serviceName: string;
  durationMinutes: number;
  sessionFee: number;
  platformFee: number;
  description?: string;
  platform?: string;
  sessions?: number;
}

export interface TherapistReviewItem {
  id: string;
  clientName: string;
  clientTitle?: string;
  rating: number;
  comment: string;
  date: string;
  images?: string[];
}

export interface TherapistFAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface TherapistCertificateItem {
  name: string;
  url: string;
}

export interface TherapistSEO {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  canonicalUrl: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  ogImageAltText?: string;
  structuredData?: string;
  htmlChunk?: string;
}

export interface Therapist {
  id: string;
  name: string;
  email?: string;
  identifier?: string;
  sequence?: number;
  notificationTitle?: string;
  photo: string;
  photoAltText?: string;
  profession: string;
  rating: number;
  reviewCount: number;
  activeClientsCount: number;
  verificationStatus: 'Verified' | 'Pending' | 'Rejected';
  accountStatus: 'Active' | 'Inactive' | 'Suspended';
  qualifications: string[];
  certificates?: (string | TherapistCertificateItem)[];
  experienceYears: number;
  clientsServed?: number;
  isCertified?: boolean;
  youtubeUrl?: string;
  languages: string[];
  bio: string;
  about?: string;
  specializations: string[];
  licenseNumber: string;
  platformFeePerSession: number;
  platformFeeType?: 'Fixed' | 'Percentage';
  totalRevenue: number;
  therapyHours: number;
  totalSessions: number;
  services?: TherapistServiceItem[];
  reviews?: TherapistReviewItem[];
  faqs?: TherapistFAQItem[];
  seo?: TherapistSEO;
  outcomes: {
    clientImprovementScore: number;
    goalAchievementRate: number;
    homeworkAdherenceRate: number;
    attendanceRate: number;
  };
  assignedClientIds: string[];
  isHiddenFromLive?: boolean;
  isBookingGreyedOut?: boolean;
  isArchived?: boolean;
}

export interface Client {
  id: string;
  name: string;
  avatar?: string;
  avatarUrl?: string;
  email: string;
  phone: string;
  assignedTherapistId?: string;
  assignedTherapistName: string;
  service: string;
  status: 'Active' | 'Completed' | 'Inactive';
  lastSession: string;
  nextSession: string;
  lastSessionDate?: string;
  nextSessionDate?: string;
  joinedDate?: string;
  aiIntakeSummary: string;
  intakeResponses: Record<string, string>;
  therapyGoals: string[];
  moodScores: { date: string; score: number }[]; // 1-10 scale
  assessmentScores: { name: string; score: string | number; maxScore?: number; date: string; severity: string }[];
  homeworkAssigned: { title: string; dueDate: string; completed: boolean }[];
  sessionHistory: { id: string; date: string; summary: string; therapistNotes: string }[];
  documents: { name: string; size: string; date: string; type: string }[];
  goals?: { title: string; targetDate?: string; status?: string }[];
  moodLogs?: { date: string; mood?: string; score: number; notes?: string }[];
  homework?: { title: string; dueDate: string; status: string }[];
  sessions?: any[];
  totalSessionsCount?: number;
  completedSessionsCount?: number;
  attendanceRate?: number;
  activePlanName?: string;
  riskLevel?: string;
  city?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  preferredLanguage?: string;
  gender?: string;
  age?: number;
  primaryConcern?: string;
  outstandingBalance?: number;
}

export type ActivityTemplateType =
  | 'cbt_thought_record'
  | 'mindfulness_audio'
  | 'journaling_prompt'
  | 'exposure_hierarchy'
  | 'behavioral_activation'
  | 'custom_html';

export interface ActivityField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'number' | 'slider' | 'media';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface ActivityConfig {
  templateType: ActivityTemplateType;
  instructions?: string;
  mediaUrl?: string;
  fields?: ActivityField[];
  customHtmlChunk?: string;
  developerNotes?: string;
  jsonSchema?: string;
}

export interface Activity {
  id: string;
  name: string;
  category: 'CBT' | 'Mindfulness' | 'Journaling' | 'Exposure' | 'Behavioral' | 'Custom';
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  creator: 'Platform Default' | string; // Therapist name or system
  timesAssigned: number;
  description: string;
  estimatedMinutes: number;
  status?: 'Active' | 'Draft';
  isVisible?: boolean;
  config?: ActivityConfig;
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  subtext?: string;
  options: { label: string; value: number }[];
  isRiskTrigger?: boolean;
}

export interface AssessmentSeverityRange {
  minScore: number;
  maxScore: number;
  label: string;
  color: string;
  clinicalAction: string;
}

export interface ClinicalAssessment {
  id: string;
  title: string;
  acronym: string;
  questionCount: number;
  targetCondition: string;
  category?: string;
  timesCompleted: number;
  type: 'Standard' | 'Custom';
  description: string;
  estimatedMinutes?: number;
  validityScore?: string;
  targetPopulation?: string;
  authorOrSource?: string;
  questions?: AssessmentQuestion[];
  severityRanges?: AssessmentSeverityRange[];
  createdAt?: string;
  lastUpdated?: string;
  status?: 'Active' | 'Draft' | 'Archived';
  assignedClientCount?: number;
}

export interface AssessmentSubmission {
  id: string;
  assessmentId: string;
  assessmentAcronym: string;
  assessmentTitle: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  therapistName: string;
  completedAt: string;
  totalScore: number;
  maxScore: number;
  severityLabel: string;
  severityColor: string;
  flaggedRisk: boolean;
  answers: { questionId: string; questionText: string; answerLabel: string; score: number }[];
}

export interface AssessmentAssignment {
  id: string;
  assessmentId: string;
  assessmentAcronym: string;
  assessmentTitle: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  therapistName: string;
  assignedDate: string;
  dueDate: string;
  frequency: 'One-time' | 'Weekly' | 'Bi-weekly' | 'Monthly';
  status: 'Pending' | 'Completed' | 'Overdue';
}


export interface MediaAsset {
  id: string;
  name: string;
  type: 'Professional' | 'Blog' | 'Consultant' | 'Client' | 'Icon' | 'Certificate' | 'Banner' | 'PDF File' | 'Video' | 'Audio' | 'Notes' | 'Other' | string;
  url: string;
  size: string;
  uploadedDate: string;
  category: string;
}

export interface ProfessionService {
  id: string;
  serviceName: string;
  identifier: string;
  slug: string;
  status: 'Active' | 'Draft' | 'Archived';
  description: string;
  imageUrl: string;
  imageAltText: string;
  heroBannerUrl: string;
  heroBannerTitle: string;
  bannerUrl?: string;
  bannerTitle?: string;
  faqs: { question: string; answer: string }[];
  consultationFee: number;
  sessionDurationMinutes: number;
  visibility: 'Public' | 'Private';
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string;
    canonicalUrl?: string;
    openGraphTitle?: string;
    openGraphDescription?: string;
    openGraphImageUrl?: string;
    openGraphImageAltText?: string;
    structuredDataJson?: string;
  };
}

export interface CarouselImageItem {
  id: string;
  imageUrl: string;
  altText: string;
  deviceType: 'Desktop' | 'Mobile';
}

export interface HomepageTestimonialItem {
  id: string;
  authorName: string;
  profession: string;
  authorEmail: string;
  authorImageUrl: string;
  authorImageAltText: string;
  content: string;
}

export interface HomepageFAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface HomepageCMS {
  general: {
    pageIdentifier: string; // slug
    notificationTitle: string;
  };
  carouselImages: CarouselImageItem[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string;
    openGraphTitle: string;
    openGraphDescription: string;
    openGraphImageUrl: string;
    openGraphImageAltText: string;
  };
  faqs: HomepageFAQItem[];
  testimonials: HomepageTestimonialItem[];
}

export interface AuditLog {
  id: string;
  user: string;
  role: string;
  action: string;
  module: string;
  timestamp: string;
  ipAddress: string;
}

export interface ZombiPageSEO {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  canonicalUrl: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  ogImageAltText?: string;
  structuredData?: string;
}

export interface ZombiPage {
  id: string;
  pageTitle: string;
  slug: string;
  targetUrl: string;
  htmlChunk: string;
  seo: ZombiPageSEO;
  status: 'Active' | 'Draft' | 'Archived';
  createdAt: string;
  updatedAt: string;
  viewsCount?: number;
}

export interface TherapistSlot {
  id: string;
  therapistId: string;
  therapistName: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  date?: string; // Optional specific date if not recurring
  startTime: string; // e.g. "09:00 AM"
  endTime: string; // e.g. "10:00 AM"
  durationMinutes: number; // e.g. 60
  sessionType: 'Google Meet';
  status: 'Available' | 'Booked' | 'Blocked' | 'Inactive';
  isRecurring: boolean;
  bookedByClientName?: string;
  priceOverride?: number;
  meetUrl?: string;
  notes?: string;
}

export interface TherapistTimeOff {
  id: string;
  therapistId: string;
  therapistName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Approved' | 'Pending';
}

