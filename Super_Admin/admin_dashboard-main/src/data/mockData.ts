import type {
  Booking,
  TherapistPayout,
  Therapist,
  Client,
  Activity,
  ClinicalAssessment,
  AssessmentSubmission,
  AssessmentAssignment,
  MediaAsset,
  ProfessionService,
  HomepageCMS,
  AuditLog,
  TherapistSlot,
  ResourceItem
} from '../types';

export const mockBookings: Booking[] = [
  {
    id: 'BK-9021',
    bookingCode: 'HEX-9021',
    clientName: 'Sarah Jenkins',
    clientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    therapistName: 'Dr. Alex Harrison',
    therapistAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    service: 'Individual Therapy',
    date: '2026-08-25',
    time: '09:00 AM - 10:00 AM',
    duration: '60 min',
    sessionType: 'Individual',
    status: 'Scheduled',
    amount: 2500,
    paymentStatus: 'Paid'
  },
  {
    id: 'BK-9022',
    bookingCode: 'HEX-9022',
    clientName: 'Michael Chen',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    therapistName: 'Dr. Elena Rostova',
    therapistAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    service: 'Couple Therapy',
    date: '2026-08-01',
    time: '10:30 AM - 11:30 AM',
    duration: '60 min',
    sessionType: 'Couple',
    status: 'Completed',
    amount: 3500,
    paymentStatus: 'Pending Payout'
  },
  {
    id: 'BK-9023',
    bookingCode: 'HEX-9023',
    clientName: 'Priya Sharma',
    clientAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    therapistName: 'Marcus Vance',
    therapistAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    service: 'Teen Therapy',
    date: '2026-08-01',
    time: '01:00 PM - 02:00 PM',
    duration: '60 min',
    sessionType: 'Teen',
    status: 'Scheduled',
    amount: 2200,
    paymentStatus: 'Paid'
  },
  {
    id: 'BK-9024',
    bookingCode: 'HEX-9024',
    clientName: 'David Miller',
    clientAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    therapistName: 'Dr. Alex Harrison',
    therapistAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    service: 'Individual Therapy',
    date: '2026-08-01',
    time: '03:00 PM - 04:00 PM',
    duration: '60 min',
    sessionType: 'Individual',
    status: 'Rescheduled',
    amount: 2500,
    paymentStatus: 'Paid'
  },
  {
    id: 'BK-9025',
    bookingCode: 'HEX-9025',
    clientName: 'Emily Watson',
    clientAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    therapistName: 'Dr. Elena Rostova',
    therapistAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    service: 'Career Counselling',
    date: '2026-07-31',
    time: '05:00 PM - 06:00 PM',
    duration: '60 min',
    sessionType: 'Career',
    status: 'Completed',
    amount: 3000,
    paymentStatus: 'Pending Payout'
  },
  {
    id: 'BK-9026',
    bookingCode: 'HEX-9026',
    clientName: 'Robert Garcia',
    clientAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    therapistName: 'Sophia Lin',
    therapistAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    service: 'Family Therapy',
    date: '2026-07-30',
    time: '11:00 AM - 12:00 PM',
    duration: '60 min',
    sessionType: 'Family',
    status: 'Cancelled',
    amount: 4000,
    paymentStatus: 'Refunded'
  },
  {
    id: 'BK-9027',
    bookingCode: 'HEX-9027',
    clientName: 'Ananya Roy',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    therapistName: 'Dr. Alex Harrison',
    therapistAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    service: 'Individual Therapy',
    date: '2026-07-29',
    time: '02:00 PM - 03:00 PM',
    duration: '60 min',
    sessionType: 'Individual',
    status: 'No Show - Client',
    amount: 2500,
    paymentStatus: 'Paid'
  },
  {
    id: 'BK-9028',
    bookingCode: 'HEX-9028',
    clientName: 'Karan Mehta',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    therapistName: 'Dr. Elena Rostova',
    therapistAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    service: 'Couple Therapy',
    date: '2026-07-28',
    time: '04:00 PM - 05:00 PM',
    duration: '60 min',
    sessionType: 'Couple',
    status: 'No Show - Consultant',
    amount: 3500,
    paymentStatus: 'Refunded'
  }
];

export const mockTherapistPayouts: TherapistPayout[] = [
  {
    id: 'PAY-101',
    therapistId: 'TH-01',
    therapistName: 'Dr. Alex Harrison',
    therapistAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    profession: 'Clinical Psychologist',
    pendingReportsCount: 4,
    sessionsCount: 12,
    lastSessionDate: '2026-07-31',
    pendingAmount: 30000,
    unpaidSessions: [
      { id: 'S-101', sessionId: 'BK-9021', sessionDate: '2026-07-31', clientName: 'Sarah Jenkins', sessionFee: 2500, status: 'Pending Review' },
      { id: 'S-102', sessionId: 'BK-9018', sessionDate: '2026-07-30', clientName: 'David Miller', sessionFee: 2500, status: 'Pending Review' },
      { id: 'S-103', sessionId: 'BK-9012', sessionDate: '2026-07-29', clientName: 'Jessica Taylor', sessionFee: 2500, status: 'Pending Review' },
      { id: 'S-104', sessionId: 'BK-9005', sessionDate: '2026-07-28', clientName: 'Arjun Nair', sessionFee: 2500, status: 'Pending Review' }
    ]
  },
  {
    id: 'PAY-102',
    therapistId: 'TH-02',
    therapistName: 'Dr. Elena Rostova',
    therapistAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    profession: 'Marriage & Family Therapist',
    pendingReportsCount: 6,
    sessionsCount: 16,
    lastSessionDate: '2026-07-31',
    pendingAmount: 38500,
    unpaidSessions: [
      { id: 'S-201', sessionId: 'BK-9022', sessionDate: '2026-07-31', clientName: 'Michael Chen', sessionFee: 3500, status: 'Pending Review' },
      { id: 'S-202', sessionId: 'BK-9025', sessionDate: '2026-07-31', clientName: 'Emily Watson', sessionFee: 3000, status: 'Pending Review' },
      { id: 'S-203', sessionId: 'BK-9010', sessionDate: '2026-07-29', clientName: 'Kevin Patel', sessionFee: 3500, status: 'Pending Review' },
      { id: 'S-204', sessionId: 'BK-9008', sessionDate: '2026-07-28', clientName: 'Amanda Lewis', sessionFee: 3500, status: 'Pending Review' },
      { id: 'S-205', sessionId: 'BK-9001', sessionDate: '2026-07-27', clientName: 'Michael Chen', sessionFee: 3500, status: 'Pending Review' },
      { id: 'S-206', sessionId: 'BK-8998', sessionDate: '2026-07-26', clientName: 'Emily Watson', sessionFee: 3000, status: 'Pending Review' }
    ]
  },
  {
    id: 'PAY-103',
    therapistId: 'TH-03',
    therapistName: 'Marcus Vance',
    therapistAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    profession: 'Adolescent Specialist',
    pendingReportsCount: 3,
    sessionsCount: 7,
    lastSessionDate: '2026-07-30',
    pendingAmount: 15500,
    unpaidSessions: [
      { id: 'S-301', sessionId: 'BK-9023', sessionDate: '2026-07-30', clientName: 'Priya Sharma', sessionFee: 2200, status: 'Pending Review' },
      { id: 'S-302', sessionId: 'BK-9014', sessionDate: '2026-07-28', clientName: 'Lucas Scott', sessionFee: 2200, status: 'Pending Review' },
      { id: 'S-303', sessionId: 'BK-9009', sessionDate: '2026-07-27', clientName: 'Chloe Bennett', sessionFee: 2200, status: 'Pending Review' }
    ]
  }
];

export const mockTherapists: Therapist[] = [
  {
    id: 'TH-00',
    name: 'Dr. Evelyn Reed, PhD',
    email: 'dr.evelyn@hexpertify.com',
    identifier: 'evelyn-reed',
    sequence: 1,
    notificationTitle: 'Dr. Evelyn Reed, PhD - Clinical Psychologist',
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    photoAltText: 'Dr. Evelyn Reed profile photo',
    profession: 'Licensed Clinical Psychologist',
    rating: 4.9,
    reviewCount: 28,
    activeClientsCount: 24,
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    qualifications: ['Ph.D. in Clinical Psychology (Columbia University)', 'Licensed Clinical Psychologist #PSY-7729', 'Certified CBT Specialist'],
    certificates: ['Board Certified in Clinical Psychology (ABPP)', 'Advanced Trauma-Informed CBT'],
    experienceYears: 11,
    clientsServed: 410,
    isCertified: true,
    youtubeUrl: 'https://youtube.com/watch?v=demo-evelyn',
    languages: ['English'],
    bio: 'Specializes in Cognitive Behavioral Therapy, mood regulation, trauma recovery, and mindfulness-based stress reduction.',
    about: 'Dr. Evelyn Reed is a licensed clinical psychologist with extensive expertise in mood disorders, anxiety spectrum, and evidence-based psychotherapy.',
    specializations: ['Cognitive Behavioral Therapy (CBT)', 'Anxiety & Panic', 'Depression Care', 'Mindfulness & Stress'],
    licenseNumber: 'PSY-NY-77291',
    platformFeePerSession: 500,
    platformFeeType: 'Fixed',
    totalRevenue: 560000,
    therapyHours: 920,
    totalSessions: 960,
    services: [
      { id: 'srv-evelyn-1', serviceName: 'Standard Clinical Psychotherapy', durationMinutes: 60, sessionFee: 3000, platformFee: 500, description: 'Individual evidence-based CBT session' },
      { id: 'srv-evelyn-2', serviceName: 'Intake & Clinical Evaluation', durationMinutes: 90, sessionFee: 4200, platformFee: 650, description: 'Comprehensive diagnostic evaluation and goal mapping' }
    ],
    reviews: [
      { id: 'rev-evelyn-1', clientName: 'Sarah Jenkins', rating: 5, comment: 'Dr. Evelyn has been wonderful, empathetic, and truly effective throughout my therapy journey.', date: '2026-08-10' }
    ],
    faqs: [
      { id: 'faq-evelyn-1', question: 'What can I expect in the first session?', answer: 'We will review your background, assess your goals, and formulate a customized therapy plan.' }
    ],
    seo: {
      metaTitle: 'Dr. Evelyn Reed, PhD | Licensed Clinical Psychologist',
      metaDescription: 'Book individual therapy with Dr. Evelyn Reed specializing in CBT and anxiety treatment.',
      keywords: 'psychologist, CBT, therapy, anxiety, depression',
      canonicalUrl: 'https://hexpertify.com/consultants/evelyn-reed'
    },
    outcomes: {
      clientImprovementScore: 95,
      goalAchievementRate: 92,
      homeworkAdherenceRate: 91,
      attendanceRate: 98
    },
    assignedClientIds: ['CL-101', 'CL-104']
  },
  {
    id: 'TH-01',
    name: 'Dr. Alex Harrison',
    email: 'alex.harrison@hexpertify.com',
    identifier: 'alex-harrison',
    sequence: 2,
    notificationTitle: 'Dr. Alex Harrison - Clinical Psychologist',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
    photoAltText: 'Dr. Alex Harrison profile photo',
    profession: 'Licensed Clinical Psychologist',
    rating: 4.9,
    reviewCount: 128,
    activeClientsCount: 18,
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    qualifications: ['Ph.D. in Clinical Psychology (Stanford)', 'Licensed PsyD #48920', 'Certified CBT Specialist'],
    certificates: ['American Psychological Association Board Certified', 'Advanced Trauma-Informed CBT'],
    experienceYears: 12,
    clientsServed: 450,
    isCertified: true,
    youtubeUrl: 'https://youtube.com/watch?v=demo-alex',
    languages: ['English', 'Spanish'],
    bio: 'Specializes in Cognitive Behavioral Therapy for mood disorders, severe anxiety, and trauma recovery.',
    about: 'Dr. Alex Harrison is a licensed clinical psychologist with over 12 years of clinical practice focusing on mood disorders and CBT.',
    specializations: ['Cognitive Behavioral Therapy (CBT)', 'Trauma Recovery', 'Panic & Anxiety', 'Depression'],
    licenseNumber: 'PSY-CA-99412',
    platformFeePerSession: 500,
    platformFeeType: 'Fixed',
    totalRevenue: 420000,
    therapyHours: 840,
    totalSessions: 890,
    services: [
      { id: 'srv-1', serviceName: 'Individual Therapy Session', durationMinutes: 60, sessionFee: 2500, platformFee: 500, description: '1-on-1 evidence-based cognitive session' },
      { id: 'srv-2', serviceName: 'Trauma & PTSD Intake Assessment', durationMinutes: 90, sessionFee: 3800, platformFee: 600, description: 'Comprehensive diagnostic evaluation' }
    ],
    reviews: [
      { id: 'rev-1', clientName: 'Sarah Jenkins', rating: 5, comment: 'Dr. Alex helped me manage panic attacks effectively. High recommend!', date: '2026-07-20' }
    ],
    faqs: [
      { id: 'faq-1', question: 'How long is a standard session?', answer: 'Standard individual therapy sessions are 60 minutes long.' }
    ],
    seo: {
      metaTitle: 'Dr. Alex Harrison | Clinical Psychologist',
      metaDescription: 'Book therapy session with Dr. Alex Harrison for CBT and anxiety treatment.',
      keywords: 'psychologist, CBT, anxiety, trauma',
      canonicalUrl: 'https://hexpertify.com/consultants/alex-harrison'
    },
    outcomes: {
      clientImprovementScore: 94,
      goalAchievementRate: 91,
      homeworkAdherenceRate: 89,
      attendanceRate: 97
    },
    assignedClientIds: ['CL-101', 'CL-104']
  },
  {
    id: 'TH-02',
    name: 'Dr. Elena Rostova',
    email: 'elena.rostova@hexpertify.com',
    identifier: 'elena-rostova',
    sequence: 2,
    notificationTitle: 'Dr. Elena Rostova - MFT',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300',
    photoAltText: 'Dr. Elena Rostova profile photo',
    profession: 'Marriage & Family Therapist',
    rating: 4.8,
    reviewCount: 94,
    activeClientsCount: 22,
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    qualifications: ['M.S. in Marital & Family Therapy', 'Gottman Method Level 3 Certified'],
    certificates: ['Gottman Institute Level 3 Master Certificate'],
    experienceYears: 9,
    clientsServed: 320,
    isCertified: true,
    youtubeUrl: 'https://youtube.com/watch?v=demo-elena',
    languages: ['English', 'Russian'],
    bio: 'Dedicated to helping couples rebuild trust, overcome communication barriers, and strengthen family dynamics.',
    about: 'Dr. Elena Rostova specializes in relationship counselling, Gottman method couples therapy, and family mediation.',
    specializations: ['Couples Therapy', 'Gottman Method', 'Conflict Resolution', 'Family Systems'],
    licenseNumber: 'MFT-NY-33019',
    platformFeePerSession: 600,
    platformFeeType: 'Fixed',
    totalRevenue: 380000,
    therapyHours: 720,
    totalSessions: 750,
    services: [
      { id: 'srv-3', serviceName: 'Couples Counseling Session', durationMinutes: 60, sessionFee: 3500, platformFee: 600, description: 'Gottman-method communication & trust session' }
    ],
    reviews: [
      { id: 'rev-2', clientName: 'Michael Chen', rating: 5, comment: 'Transformed our marriage. Very insightful therapist.', date: '2026-07-15' }
    ],
    faqs: [
      { id: 'faq-2', question: 'Do both partners need to be present?', answer: 'Yes, for couples counseling both partners should attend.' }
    ],
    seo: {
      metaTitle: 'Dr. Elena Rostova | Marriage & Family Therapist',
      metaDescription: 'Couples therapy and Gottman method counseling by Dr. Elena Rostova.',
      keywords: 'couples therapy, marriage counselor, Gottman',
      canonicalUrl: 'https://hexpertify.com/consultants/elena-rostova'
    },
    outcomes: {
      clientImprovementScore: 90,
      goalAchievementRate: 88,
      homeworkAdherenceRate: 92,
      attendanceRate: 95
    },
    assignedClientIds: ['CL-102', 'CL-105']
  },
  {
    id: 'TH-03',
    name: 'Marcus Vance',
    email: 'marcus.vance@hexpertify.com',
    identifier: 'marcus-vance',
    sequence: 3,
    notificationTitle: 'Marcus Vance - Youth Specialist',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
    photoAltText: 'Marcus Vance photo',
    profession: 'Adolescent & Teen Counselor',
    rating: 4.7,
    reviewCount: 62,
    activeClientsCount: 15,
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    qualifications: ['M.A. in Counseling Psychology', 'Certified Youth Mental Health First Aid'],
    certificates: ['Youth Counseling Board Certification'],
    experienceYears: 7,
    clientsServed: 210,
    isCertified: true,
    youtubeUrl: '',
    languages: ['English'],
    bio: 'Empowering teens and young adults to navigate social stress, academic pressure, and self-identity.',
    about: 'Marcus Vance is an experienced adolescent counselor specializing in teen mental health and youth executive function.',
    specializations: ['Teen Counseling', 'ADHD & Executive Function', 'Self-Esteem', 'Social Anxiety'],
    licenseNumber: 'LPC-TX-88210',
    platformFeePerSession: 450,
    platformFeeType: 'Fixed',
    totalRevenue: 240000,
    therapyHours: 510,
    totalSessions: 530,
    services: [
      { id: 'srv-4', serviceName: 'Teen Mentorship & Counseling', durationMinutes: 60, sessionFee: 2200, platformFee: 450, description: 'Youth anxiety and executive function coaching' }
    ],
    reviews: [],
    faqs: [],
    seo: {
      metaTitle: 'Marcus Vance | Adolescent Counselor',
      metaDescription: 'Teen counseling and youth mental health with Marcus Vance LPC.',
      keywords: 'teen therapy, adolescent counselor, ADHD',
      canonicalUrl: 'https://hexpertify.com/consultants/marcus-vance'
    },
    outcomes: {
      clientImprovementScore: 88,
      goalAchievementRate: 85,
      homeworkAdherenceRate: 86,
      attendanceRate: 93
    },
    assignedClientIds: ['CL-103']
  },
  {
    id: 'TH-04',
    name: 'Marcus Thorne',
    email: 'marcus.thorne@hexpertify.com',
    identifier: 'marcus-thorne',
    sequence: 5,
    notificationTitle: 'Marcus Thorne - Intuitive Counselor',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    photoAltText: 'Marcus Thorne photo',
    profession: 'Intuitive & Career Counselor',
    rating: 4.8,
    reviewCount: 85,
    activeClientsCount: 19,
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    qualifications: ['Certified Intuitive Practitioner', 'Master Career Coach (CPCC)'],
    certificates: ['Career Transition Certification', 'Holistic Guidance Diploma'],
    experienceYears: 8,
    clientsServed: 290,
    isCertified: true,
    youtubeUrl: 'https://youtube.com/watch?v=demo-thorne',
    languages: ['English', 'Spanish'],
    bio: 'Guiding individuals through career transitions, creative blocks, and self-alignment.',
    about: 'Marcus Thorne has 8+ years helping professionals rediscover direction and purpose.',
    specializations: ['Career Transition', 'Life Alignment', 'Creative Blocks', 'Spiritual Guidance'],
    licenseNumber: 'ICC-CA-77120',
    platformFeePerSession: 450,
    platformFeeType: 'Fixed',
    totalRevenue: 310000,
    therapyHours: 640,
    totalSessions: 670,
    services: [
      { id: 'srv-5', serviceName: 'Career Clarity & Life Roadmap', durationMinutes: 60, sessionFee: 2400, platformFee: 450, description: '1-on-1 career direction and strategic mapping' }
    ],
    reviews: [
      { id: 'rev-3', clientName: 'Emily Watson', rating: 5, comment: 'Gave me clarity during a major job switch.', date: '2026-08-05' }
    ],
    faqs: [
      { id: 'faq-3', question: 'How can I prepare?', answer: 'Have a list of your top 3 current challenges or questions.' }
    ],
    seo: {
      metaTitle: 'Marcus Thorne | Intuitive Career Counselor',
      metaDescription: 'Book career transition and life roadmap sessions with Marcus Thorne.',
      keywords: 'career coach, life guidance, career transitions',
      canonicalUrl: 'https://hexpertify.com/consultants/marcus-thorne'
    },
    outcomes: {
      clientImprovementScore: 91,
      goalAchievementRate: 89,
      homeworkAdherenceRate: 88,
      attendanceRate: 96
    },
    assignedClientIds: ['CL-104']
  },
  {
    id: 'TH-05',
    name: 'Sophia Chakra',
    email: 'sophia.chakra@hexpertify.com',
    identifier: 'sophia-chakra',
    sequence: 6,
    notificationTitle: 'Sophia Chakra - Mindfulness Expert',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300',
    photoAltText: 'Sophia Chakra photo',
    profession: 'Holistic Wellness & Mindfulness Expert',
    rating: 4.9,
    reviewCount: 110,
    activeClientsCount: 26,
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    qualifications: ['M.Sc. in Holistic Health & Wellness', 'Certified Mindfulness-Based Stress Reduction (MBSR)'],
    certificates: ['Reiki Master Teacher', 'Yoga Alliance ERYT-500'],
    experienceYears: 12,
    clientsServed: 520,
    isCertified: true,
    youtubeUrl: 'https://youtube.com/watch?v=demo-sophia',
    languages: ['English', 'Hindi', 'Sanskrit'],
    bio: 'Integrative holistic wellness consultant focusing on nervous system regulation, chakra alignment, and somatic grounding.',
    about: 'Sophia Chakra has 12 years of clinical holistic practice guiding clients toward emotional equilibrium.',
    specializations: ['Mindfulness & MBSR', 'Somatic Grounding', 'Nervous System Reset', 'Holistic Breathwork'],
    licenseNumber: 'HW-NY-55209',
    platformFeePerSession: 500,
    platformFeeType: 'Fixed',
    totalRevenue: 490000,
    therapyHours: 880,
    totalSessions: 910,
    services: [
      { id: 'srv-6', serviceName: 'Holistic Somatic & Chakra Alignment', durationMinutes: 60, sessionFee: 2800, platformFee: 500, description: 'Deep breathwork, somatic grounding, and emotional release' }
    ],
    reviews: [
      { id: 'rev-4', clientName: 'Priya Sharma', rating: 5, comment: 'Incredible grounding session. Felt completely rejuvenated.', date: '2026-08-12' }
    ],
    faqs: [
      { id: 'faq-4', question: 'Are sessions suitable for beginners?', answer: 'Yes, all somatic practices are gentle and tailored to your baseline comfort.' }
    ],
    seo: {
      metaTitle: 'Sophia Chakra | Holistic Wellness Consultant',
      metaDescription: 'Experience somatic breathwork and mindfulness with Sophia Chakra.',
      keywords: 'mindfulness, somatic healing, holistic wellness, breathwork',
      canonicalUrl: 'https://hexpertify.com/consultants/sophia-chakra'
    },
    outcomes: {
      clientImprovementScore: 96,
      goalAchievementRate: 94,
      homeworkAdherenceRate: 92,
      attendanceRate: 99
    },
    assignedClientIds: ['CL-102']
  },
  {
    id: 'TH-06',
    name: 'Dr. Priya Sharma, PsyD',
    email: 'priya.sharma@hexpertify.com',
    identifier: 'priya-sharma',
    sequence: 7,
    notificationTitle: 'Dr. Priya Sharma - Neuropsychologist',
    photo: 'https://images.unsplash.com/photo-1594824813591-4e94b29dbb71?w=300',
    photoAltText: 'Dr. Priya Sharma photo',
    profession: 'Clinical Neuropsychologist',
    rating: 4.9,
    reviewCount: 78,
    activeClientsCount: 20,
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    qualifications: ['Psy.D. in Clinical Neuropsychology (Harvard)', 'Board Certified in Clinical Neuropsychology (ABCN)'],
    certificates: ['ADHD & Neurodivergence Assessment Specialist'],
    experienceYears: 10,
    clientsServed: 360,
    isCertified: true,
    youtubeUrl: '',
    languages: ['English', 'Hindi'],
    bio: 'Specializing in neurodivergence, adult ADHD evaluations, cognitive rehabilitation, and executive function training.',
    about: 'Dr. Priya Sharma brings deep expertise in cognitive assessment, executive function coaching, and ADHD management.',
    specializations: ['Adult ADHD', 'Executive Functioning', 'Cognitive Rehabilitation', 'Neurodiversity'],
    licenseNumber: 'PSY-MA-88431',
    platformFeePerSession: 600,
    platformFeeType: 'Fixed',
    totalRevenue: 460000,
    therapyHours: 780,
    totalSessions: 810,
    services: [
      { id: 'srv-7', serviceName: 'Neuropsychological Intake & Executive Coaching', durationMinutes: 60, sessionFee: 3600, platformFee: 600, description: 'Executive function scaffolding and cognitive strategy' }
    ],
    reviews: [],
    faqs: [],
    seo: {
      metaTitle: 'Dr. Priya Sharma | Clinical Neuropsychologist',
      metaDescription: 'ADHD evaluations and cognitive coaching with Dr. Priya Sharma.',
      keywords: 'neuropsychologist, ADHD, executive function, cognitive therapy',
      canonicalUrl: 'https://hexpertify.com/consultants/priya-sharma'
    },
    outcomes: {
      clientImprovementScore: 93,
      goalAchievementRate: 90,
      homeworkAdherenceRate: 91,
      attendanceRate: 96
    },
    assignedClientIds: ['CL-105']
  },
  {
    id: 'TH-07',
    name: 'Dr. David Miller, MD',
    email: 'david.miller@hexpertify.com',
    identifier: 'david-miller',
    sequence: 8,
    notificationTitle: 'Dr. David Miller - Psychiatrist',
    photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300',
    photoAltText: 'Dr. David Miller photo',
    profession: 'Adult & Child Psychiatrist',
    rating: 4.8,
    reviewCount: 92,
    activeClientsCount: 25,
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    qualifications: ['M.D. in Psychiatry (Johns Hopkins)', 'Board Certified General & Child Psychiatrist'],
    certificates: ['Psychopharmacology Fellowship Certificate'],
    experienceYears: 14,
    clientsServed: 680,
    isCertified: true,
    youtubeUrl: '',
    languages: ['English'],
    bio: 'Providing integrative psychiatric evaluations, evidence-based medication reviews, and combined psychotherapeutic management.',
    about: 'Dr. David Miller is a board-certified psychiatrist dedicated to holistic mental healthcare.',
    specializations: ['Psychiatric Evaluation', 'Medication Management', 'Mood Disorders', 'Bipolar & Anxiety'],
    licenseNumber: 'MD-IL-44910',
    platformFeePerSession: 700,
    platformFeeType: 'Fixed',
    totalRevenue: 620000,
    therapyHours: 940,
    totalSessions: 980,
    services: [
      { id: 'srv-8', serviceName: 'Comprehensive Psychiatric Evaluation', durationMinutes: 60, sessionFee: 4500, platformFee: 700, description: 'Diagnostic evaluation and personalized treatment plan' }
    ],
    reviews: [],
    faqs: [],
    seo: {
      metaTitle: 'Dr. David Miller, MD | Board Certified Psychiatrist',
      metaDescription: 'Expert psychiatric evaluations and medication consultations with Dr. David Miller.',
      keywords: 'psychiatrist, mental health, mood disorders, medication review',
      canonicalUrl: 'https://hexpertify.com/consultants/david-miller'
    },
    outcomes: {
      clientImprovementScore: 94,
      goalAchievementRate: 92,
      homeworkAdherenceRate: 90,
      attendanceRate: 98
    },
    assignedClientIds: ['CL-101']
  },
  {
    id: 'TH-08',
    name: 'Dr. Aris Thorne',
    email: 'aris.thorne@hexpertify.com',
    identifier: 'aris-thorne',
    sequence: 9,
    notificationTitle: 'Dr. Aris Thorne - Somatic Specialist',
    photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300',
    photoAltText: 'Dr. Aris Thorne photo',
    profession: 'Trauma & Somatic Psychotherapist',
    rating: 4.9,
    reviewCount: 65,
    activeClientsCount: 17,
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    qualifications: ['Ph.D. in Somatic Psychology', 'Certified Somatic Experiencing Practitioner (SEP)'],
    certificates: ['EMDR International Association Certified'],
    experienceYears: 9,
    clientsServed: 310,
    isCertified: true,
    youtubeUrl: '',
    languages: ['English', 'German'],
    bio: 'Somatic Experiencing and EMDR trauma practitioner helping clients release stored autonomic nervous system stress.',
    about: 'Dr. Aris Thorne specializes in deep somatic trauma processing and polyvagal regulation.',
    specializations: ['Somatic Experiencing (SE)', 'EMDR Therapy', 'Complex PTSD', 'Polyvagal Regulation'],
    licenseNumber: 'PSY-WA-66320',
    platformFeePerSession: 550,
    platformFeeType: 'Fixed',
    totalRevenue: 390000,
    therapyHours: 710,
    totalSessions: 740,
    services: [
      { id: 'srv-9', serviceName: 'Somatic Experiencing & EMDR Trauma Session', durationMinutes: 60, sessionFee: 3200, platformFee: 550, description: 'Somatic body-based nervous system regulation' }
    ],
    reviews: [],
    faqs: [],
    seo: {
      metaTitle: 'Dr. Aris Thorne | Somatic Psychotherapist',
      metaDescription: 'Somatic experiencing and EMDR trauma therapy with Dr. Aris Thorne.',
      keywords: 'somatic experiencing, EMDR, trauma therapy, polyvagal',
      canonicalUrl: 'https://hexpertify.com/consultants/aris-thorne'
    },
    outcomes: {
      clientImprovementScore: 95,
      goalAchievementRate: 91,
      homeworkAdherenceRate: 89,
      attendanceRate: 97
    },
    assignedClientIds: ['CL-103']
  }
];


export const mockClients: Client[] = [
  {
    id: 'CL-101',
    name: 'Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    email: 'sarah.j@example.com',
    phone: '+1 (555) 234-5678',
    assignedTherapistId: 'TH-01',
    assignedTherapistName: 'Dr. Alex Harrison',
    service: 'Individual Therapy',
    status: 'Active',
    lastSession: '2026-07-28',
    nextSession: '2026-08-01 (09:00 AM)',
    aiIntakeSummary: 'Client presents with persistent generalized anxiety, work-related burnout, and mild insomnia over the past 6 months. Seeking CBT coping strategies and sleep hygiene guidance.',
    intakeResponses: {
      'Primary Concern': 'Generalized Anxiety & Workplace Stress',
      'Symptom Onset': '6 months ago',
      'Previous Therapy': 'Yes (1 year ago)',
      'Medication': 'None reported',
      'Sleep Average': '5.5 hours/night'
    },
    therapyGoals: [
      'Reduce GAD-7 anxiety score from 14 (Moderate) to < 6 (Mild)',
      'Establish consistent 7+ hour sleep routine using sleep restriction technique',
      'Implement daily 10-minute mindfulness breathing before work meetings'
    ],
    moodScores: [
      { date: 'Jul 24', score: 4 },
      { date: 'Jul 25', score: 5 },
      { date: 'Jul 26', score: 6 },
      { date: 'Jul 27', score: 7 },
      { date: 'Jul 28', score: 8 },
      { date: 'Jul 29', score: 7 },
      { date: 'Jul 30', score: 8 }
    ],
    assessmentScores: [
      { name: 'PHQ-9 (Depression)', score: '6 / 27', date: '2026-07-20', severity: 'Mild' },
      { name: 'GAD-7 (Anxiety)', score: '12 / 21', date: '2026-07-20', severity: 'Moderate' }
    ],
    homeworkAssigned: [
      { title: 'Thought Record Log (3 entries)', dueDate: '2026-08-01', completed: true },
      { title: 'Progressive Muscle Relaxation Audio', dueDate: '2026-08-01', completed: false }
    ],
    sessionHistory: [
      { id: 'SH-01', date: '2026-07-28', summary: 'CBT Cognitive Restructuring Session #11', therapistNotes: 'Worked on identifying catastrophic thinking regarding upcoming quarterly reviews.' },
      { id: 'SH-02', date: '2026-07-21', summary: 'Sleep Hygiene Assessment Session #10', therapistNotes: 'Client reports improved sleep onset latency after eliminating screens 1hr prior to bed.' }
    ],
    documents: [
      { name: 'Intake_Consent_Signed.pdf', size: '1.2 MB', date: '2026-06-01', type: 'PDF' },
      { name: 'CBT_Thought_Record_Sheet.pdf', size: '450 KB', date: '2026-07-15', type: 'PDF' }
    ]
  },
  {
    id: 'CL-102',
    name: 'Michael & Jennifer Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    email: 'm.chen@example.com',
    phone: '+1 (555) 876-5432',
    assignedTherapistId: 'TH-02',
    assignedTherapistName: 'Dr. Elena Rostova',
    service: 'Couple Therapy',
    status: 'Active',
    lastSession: '2026-07-29',
    nextSession: '2026-08-01 (10:30 AM)',
    aiIntakeSummary: 'Couples intake for communication friction and balancing high-demand dual careers. Goal is to enhance emotional intimacy and de-escalate argument cycles.',
    intakeResponses: {
      'Years Married': '7 years',
      'Main Challenge': 'Communication breakdown under stress',
      'Gottman Assessment': 'High commitment, low conflict repair'
    },
    therapyGoals: [
      'Master Gottman Softened Startup technique during disagreements',
      'Schedule dedicated weekly electronic-free connection date'
    ],
    moodScores: [
      { date: 'Jul 24', score: 6 },
      { date: 'Jul 25', score: 6 },
      { date: 'Jul 26', score: 7 },
      { date: 'Jul 27', score: 8 },
      { date: 'Jul 28', score: 8 },
      { date: 'Jul 29', score: 9 }
    ],
    assessmentScores: [
      { name: 'Dyadic Adjustment Scale', score: '104 / 151', date: '2026-07-01', severity: 'Moderate Strain' }
    ],
    homeworkAssigned: [
      { title: 'Weekly State of the Union Conversation', dueDate: '2026-08-01', completed: true }
    ],
    sessionHistory: [
      { id: 'SH-03', date: '2026-07-29', summary: 'Conflict De-escalation Practice Session #8', therapistNotes: 'Practiced using "I" statements during budget planning discussion.' }
    ],
    documents: [
      { name: 'Couples_Agreement_Plan.pdf', size: '890 KB', date: '2026-07-10', type: 'PDF' }
    ]
  }
];

export const mockActivities: Activity[] = [
  {
    id: 'ACT-01',
    name: '5-4-3-2-1 Grounding Technique',
    category: 'Mindfulness',
    difficulty: 'Easy',
    creator: 'Platform Default',
    timesAssigned: 340,
    description: 'A sensory awareness exercise to reduce acute anxiety and panic symptoms.',
    estimatedMinutes: 5,
    status: 'Active',
    config: {
      templateType: 'mindfulness_audio',
      instructions: 'Acknowledge 5 things you see, 4 things you can feel, 3 things you hear, 2 things you smell, and 1 thing you taste.',
      mediaUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=mindful-breathing-113337.mp3',
      developerNotes: 'Developer Note: Render with interactive 5-step interactive audio guide & breathing ring timer component.',
      fields: [
        { id: 'f1', label: '5 Things You Can See', type: 'text', placeholder: 'e.g. Lamp, window, blue notebook...' },
        { id: 'f2', label: '4 Things You Can Touch', type: 'text', placeholder: 'e.g. Chair armrest, warm mug...' },
        { id: 'f3', label: '3 Things You Can Hear', type: 'text', placeholder: 'e.g. Traffic, AC hum, birds...' },
        { id: 'f4', label: '2 Things You Can Smell', type: 'text', placeholder: 'e.g. Coffee aroma, fresh rain...' },
        { id: 'f5', label: '1 Thing You Can Taste', type: 'text', placeholder: 'e.g. Mint gum, herbal tea...' }
      ]
    }
  },
  {
    id: 'ACT-02',
    name: 'CBT Automatic Thought Record',
    category: 'CBT',
    difficulty: 'Medium',
    creator: 'Platform Default',
    timesAssigned: 512,
    description: 'Log trigger events, automatic negative thoughts, cognitive distortions, and rational reframes.',
    estimatedMinutes: 15,
    status: 'Active',
    config: {
      templateType: 'cbt_thought_record',
      instructions: 'Identify the situation, automatic thought, distortion category, and balanced alternative thought.',
      developerNotes: 'Developer Note: Render with 5-column Beck CBT Thought Record table & distortion dropdown tag selector.',
      fields: [
        { id: 'f1', label: 'Triggering Situation / Event', type: 'textarea', placeholder: 'What happened? Where were you?' },
        { id: 'f2', label: 'Automatic Negative Thought (ANT)', type: 'textarea', placeholder: 'What exact thought ran through your mind?' },
        { id: 'f3', label: 'Initial Emotion Rating (1-100%)', type: 'slider', placeholder: '85' },
        { id: 'f4', label: 'Cognitive Distortion Identified', type: 'select', options: ['Catastrophizing', 'All-or-Nothing Thinking', 'Mind Reading', 'Overgeneralization', 'Emotional Reasoning'] },
        { id: 'f5', label: 'Alternative Rational Reframe', type: 'textarea', placeholder: 'What is a more realistic and objective view?' }
      ]
    }
  },
  {
    id: 'ACT-03',
    name: 'Progressive Muscle Relaxation (PMR)',
    category: 'Mindfulness',
    difficulty: 'Easy',
    creator: 'Dr. Alex Harrison',
    timesAssigned: 198,
    description: 'Systematically tense and release muscle groups from toes to head for physical stress relief.',
    estimatedMinutes: 12,
    status: 'Active',
    config: {
      templateType: 'mindfulness_audio',
      instructions: 'Tense each muscle group for 5 seconds, then release completely for 10 seconds.',
      mediaUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio-[#5e2be2].mp3',
      developerNotes: 'Developer Note: Includes muscular tension guide visualizer component.',
      fields: [
        { id: 'f1', label: 'Pre-Exercise Tension Rating (1-10)', type: 'slider' },
        { id: 'f2', label: 'Post-Exercise Tension Rating (1-10)', type: 'slider' },
        { id: 'f3', label: 'Body Relaxation Reflection', type: 'textarea', placeholder: 'Which muscle groups felt most relieved?' }
      ]
    }
  },
  {
    id: 'ACT-04',
    name: 'Fear Hierarchy & Exposure Ladder',
    category: 'Exposure',
    difficulty: 'Advanced',
    creator: 'Platform Default',
    timesAssigned: 145,
    description: 'Step-by-step graded exposure tracking for phobias and social anxiety disorders.',
    estimatedMinutes: 25,
    status: 'Active',
    config: {
      templateType: 'exposure_hierarchy',
      instructions: 'Rank feared situations from lowest to highest SUDS anxiety score (0-100). Practice step by step.',
      developerNotes: 'Developer Note: Interactive SUDS (Subjective Units of Distress Scale) ladder builder.',
      fields: [
        { id: 'f1', label: 'Step 1: Mild Fear Trigger (SUDS 20-30)', type: 'text', placeholder: 'e.g. Saying hello to a neighbor' },
        { id: 'f2', label: 'Step 2: Moderate Fear Trigger (SUDS 40-60)', type: 'text', placeholder: 'e.g. Asking a question in a group meeting' },
        { id: 'f3', label: 'Step 3: High Fear Trigger (SUDS 70-90)', type: 'text', placeholder: 'e.g. Giving a 5-minute presentation' }
      ]
    }
  }
];

export const mockAssessments: ClinicalAssessment[] = [
  {
    id: 'ASS-01',
    title: 'Perceived Stress Scale-10',
    acronym: 'PSS-10',
    questionCount: 10,
    targetCondition: 'Perceived Stress',
    category: 'Stress',
    timesCompleted: 1240,
    type: 'Standard',
    description: 'Classic 10-item instrument measuring the degree to which situations in one\'s life are appraised as unpredictable, uncontrollable, and overloading.',
    estimatedMinutes: 4,
    validityScore: "Cronbach's α = 0.88",
    targetPopulation: 'General for all clients',
    authorOrSource: 'Cohen, Kamarck & Mermelstein (1983) / Mind Garden',
    status: 'Active',
    assignedClientCount: 380,
    createdAt: '2025-01-10',
    severityRanges: [
      { minScore: 0, maxScore: 13, label: 'Low Perceived Stress', color: 'bg-emerald-500', clinicalAction: 'Normal stress coping capacity. Continue routine wellness activities.' },
      { minScore: 14, maxScore: 26, label: 'Moderate Stress', color: 'bg-amber-500', clinicalAction: 'Stress management education and mindfulness practice recommended.' },
      { minScore: 27, maxScore: 40, label: 'High Perceived Stress', color: 'bg-rose-600', clinicalAction: 'Targeted CBT stress reduction protocol and clinical coping review indicated.' }
    ],
    questions: [
      {
        id: 'q1',
        text: 'In the last month, how often have you been upset because of something that happened unexpectedly?',
        options: [
          { label: 'Never (0)', value: 0 },
          { label: 'Almost Never (1)', value: 1 },
          { label: 'Sometimes (2)', value: 2 },
          { label: 'Fairly Often (3)', value: 3 },
          { label: 'Very Often (4)', value: 4 }
        ]
      },
      {
        id: 'q2',
        text: 'In the last month, how often have you felt that you were unable to control the important things in your life?',
        options: [
          { label: 'Never (0)', value: 0 },
          { label: 'Almost Never (1)', value: 1 },
          { label: 'Sometimes (2)', value: 2 },
          { label: 'Fairly Often (3)', value: 3 },
          { label: 'Very Often (4)', value: 4 }
        ]
      },
      {
        id: 'q3',
        text: 'In the last month, how often have you felt nervous and stressed?',
        options: [
          { label: 'Never (0)', value: 0 },
          { label: 'Almost Never (1)', value: 1 },
          { label: 'Sometimes (2)', value: 2 },
          { label: 'Fairly Often (3)', value: 3 },
          { label: 'Very Often (4)', value: 4 }
        ]
      },
      {
        id: 'q4',
        text: 'In the last month, how often have you felt confident about your ability to handle your personal problems?',
        subtext: 'REVERSE SCORED ITEM (0=4, 1=3, 2=2, 3=1, 4=0)',
        options: [
          { label: 'Never (0)', value: 0 },
          { label: 'Almost Never (1)', value: 1 },
          { label: 'Sometimes (2)', value: 2 },
          { label: 'Fairly Often (3)', value: 3 },
          { label: 'Very Often (4)', value: 4 }
        ]
      },
      {
        id: 'q5',
        text: 'In the last month, how often have you felt that things were going your way?',
        subtext: 'REVERSE SCORED ITEM (0=4, 1=3, 2=2, 3=1, 4=0)',
        options: [
          { label: 'Never (0)', value: 0 },
          { label: 'Almost Never (1)', value: 1 },
          { label: 'Sometimes (2)', value: 2 },
          { label: 'Fairly Often (3)', value: 3 },
          { label: 'Very Often (4)', value: 4 }
        ]
      },
      {
        id: 'q6',
        text: 'In the last month, how often have you found that you could not cope with all the things that you had to do?',
        options: [
          { label: 'Never (0)', value: 0 },
          { label: 'Almost Never (1)', value: 1 },
          { label: 'Sometimes (2)', value: 2 },
          { label: 'Fairly Often (3)', value: 3 },
          { label: 'Very Often (4)', value: 4 }
        ]
      },
      {
        id: 'q7',
        text: 'In the last month, how often have you been able to control irritations in your life?',
        subtext: 'REVERSE SCORED ITEM (0=4, 1=3, 2=2, 3=1, 4=0)',
        options: [
          { label: 'Never (0)', value: 0 },
          { label: 'Almost Never (1)', value: 1 },
          { label: 'Sometimes (2)', value: 2 },
          { label: 'Fairly Often (3)', value: 3 },
          { label: 'Very Often (4)', value: 4 }
        ]
      },
      {
        id: 'q8',
        text: 'In the last month, how often have you felt that you were on top of things?',
        subtext: 'REVERSE SCORED ITEM (0=4, 1=3, 2=2, 3=1, 4=0)',
        options: [
          { label: 'Never (0)', value: 0 },
          { label: 'Almost Never (1)', value: 1 },
          { label: 'Sometimes (2)', value: 2 },
          { label: 'Fairly Often (3)', value: 3 },
          { label: 'Very Often (4)', value: 4 }
        ]
      },
      {
        id: 'q9',
        text: 'In the last month, how often have you been angered because of things that happened that were outside of your control?',
        options: [
          { label: 'Never (0)', value: 0 },
          { label: 'Almost Never (1)', value: 1 },
          { label: 'Sometimes (2)', value: 2 },
          { label: 'Fairly Often (3)', value: 3 },
          { label: 'Very Often (4)', value: 4 }
        ]
      },
      {
        id: 'q10',
        text: 'In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?',
        options: [
          { label: 'Never (0)', value: 0 },
          { label: 'Almost Never (1)', value: 1 },
          { label: 'Sometimes (2)', value: 2 },
          { label: 'Fairly Often (3)', value: 3 },
          { label: 'Very Often (4)', value: 4 }
        ]
      }
    ]
  },
  {
    id: 'ASS-02',
    title: 'WHO-5 Well-Being Index',
    acronym: 'WHO-5',
    questionCount: 5,
    targetCondition: 'Subjective Well-Being',
    category: 'Well-Being',
    timesCompleted: 1560,
    type: 'Standard',
    description: 'Official World Health Organization 5-item rating scale measuring subjective psychological well-being over the past two weeks.',
    estimatedMinutes: 3,
    validityScore: "Cronbach's α = 0.91",
    targetPopulation: 'General for all clients',
    authorOrSource: 'World Health Organization (WHO 2024)',
    status: 'Active',
    assignedClientCount: 490,
    createdAt: '2025-01-05',
    severityRanges: [
      { minScore: 13, maxScore: 25, label: 'Good Well-Being (50-100%)', color: 'bg-emerald-500', clinicalAction: 'Positive mental well-being. Maintain routine support.' },
      { minScore: 7, maxScore: 12, label: 'Reduced Well-Being (28-48%)', color: 'bg-amber-500', clinicalAction: 'Monitoring indicated. Explore lifestyle and coping strategies.' },
      { minScore: 0, maxScore: 6, label: 'Poor Well-Being (<25%)', color: 'bg-rose-600', clinicalAction: 'Screening for depression and formal clinical assessment strongly indicated.' }
    ],
    questions: [
      {
        id: 'w1',
        text: 'I have felt cheerful and in good spirits',
        options: [
          { label: 'All of the time (5)', value: 5 },
          { label: 'Most of the time (4)', value: 4 },
          { label: 'More than half of the time (3)', value: 3 },
          { label: 'Less than half of the time (2)', value: 2 },
          { label: 'Some of the time (1)', value: 1 },
          { label: 'At no time (0)', value: 0 }
        ]
      },
      {
        id: 'w2',
        text: 'I have felt calm and relaxed',
        options: [
          { label: 'All of the time (5)', value: 5 },
          { label: 'Most of the time (4)', value: 4 },
          { label: 'More than half of the time (3)', value: 3 },
          { label: 'Less than half of the time (2)', value: 2 },
          { label: 'Some of the time (1)', value: 1 },
          { label: 'At no time (0)', value: 0 }
        ]
      },
      {
        id: 'w3',
        text: 'I have felt active and vigorous',
        options: [
          { label: 'All of the time (5)', value: 5 },
          { label: 'Most of the time (4)', value: 4 },
          { label: 'More than half of the time (3)', value: 3 },
          { label: 'Less than half of the time (2)', value: 2 },
          { label: 'Some of the time (1)', value: 1 },
          { label: 'At no time (0)', value: 0 }
        ]
      },
      {
        id: 'w4',
        text: 'I woke up feeling fresh and rested',
        options: [
          { label: 'All of the time (5)', value: 5 },
          { label: 'Most of the time (4)', value: 4 },
          { label: 'More than half of the time (3)', value: 3 },
          { label: 'Less than half of the time (2)', value: 2 },
          { label: 'Some of the time (1)', value: 1 },
          { label: 'At no time (0)', value: 0 }
        ]
      },
      {
        id: 'w5',
        text: 'My daily life has been filled with things that interest me',
        options: [
          { label: 'All of the time (5)', value: 5 },
          { label: 'Most of the time (4)', value: 4 },
          { label: 'More than half of the time (3)', value: 3 },
          { label: 'Less than half of the time (2)', value: 2 },
          { label: 'Some of the time (1)', value: 1 },
          { label: 'At no time (0)', value: 0 }
        ]
      }
    ]
  },
  {
    id: 'ASS-03',
    title: 'Work and Social Adjustment Scale',
    acronym: 'WSAS',
    questionCount: 5,
    targetCondition: 'Functional Impairment',
    category: 'Well-Being',
    timesCompleted: 940,
    type: 'Standard',
    description: 'Simple 5-item measure of impairment in functioning across work, home management, social leisure, private leisure, and relationships.',
    estimatedMinutes: 3,
    validityScore: "Cronbach's α = 0.86",
    targetPopulation: 'General for all clients',
    authorOrSource: 'Mundt, Marks, Shear & Greist (2002)',
    status: 'Active',
    assignedClientCount: 310,
    createdAt: '2025-01-12',
    severityRanges: [
      { minScore: 0, maxScore: 9, label: 'Subclinical Population', color: 'bg-emerald-500', clinicalAction: 'Minimal functional impairment.' },
      { minScore: 10, maxScore: 20, label: 'Significant Impairment', color: 'bg-amber-500', clinicalAction: 'Significant functional impairment with mild to moderate clinical symptomatology.' },
      { minScore: 21, maxScore: 40, label: 'Severe Impairment', color: 'bg-rose-600', clinicalAction: 'Moderately severe or worse psychopathology indicating urgent functional rehabilitation.' }
    ],
    questions: [
      {
        id: 'ws1',
        text: 'Because of my problem my ability to work is impaired',
        subtext: '\'0\' means \'not at all impaired\' and \'8\' means very severely impaired to the point I can\'t work.',
        options: [
          { label: '0 - Not at all', value: 0 },
          { label: '2 - Slightly', value: 2 },
          { label: '4 - Definitely', value: 4 },
          { label: '6 - Markedly', value: 6 },
          { label: '8 - Very severely', value: 8 }
        ]
      },
      {
        id: 'ws2',
        text: 'Because of my problem my home management (cleaning, tidying, shopping, cooking, looking after home/children, paying bills) is impaired',
        options: [
          { label: '0 - Not at all', value: 0 },
          { label: '2 - Slightly', value: 2 },
          { label: '4 - Definitely', value: 4 },
          { label: '6 - Markedly', value: 6 },
          { label: '8 - Very severely', value: 8 }
        ]
      },
      {
        id: 'ws3',
        text: 'Because of my problem my social leisure activities (with other people e.g. parties, bars, clubs, outings, visits, dating) are impaired',
        options: [
          { label: '0 - Not at all', value: 0 },
          { label: '2 - Slightly', value: 2 },
          { label: '4 - Definitely', value: 4 },
          { label: '6 - Markedly', value: 6 },
          { label: '8 - Very severely', value: 8 }
        ]
      },
      {
        id: 'ws4',
        text: 'Because of my problem, my private leisure activities (done alone, such as reading, gardening, collecting, sewing, walking alone) are impaired',
        options: [
          { label: '0 - Not at all', value: 0 },
          { label: '2 - Slightly', value: 2 },
          { label: '4 - Definitely', value: 4 },
          { label: '6 - Markedly', value: 6 },
          { label: '8 - Very severely', value: 8 }
        ]
      },
      {
        id: 'ws5',
        text: 'Because of my problem, my ability to form and maintain close relationships with others, including those I live with, is impaired',
        options: [
          { label: '0 - Not at all', value: 0 },
          { label: '2 - Slightly', value: 2 },
          { label: '4 - Definitely', value: 4 },
          { label: '6 - Markedly', value: 6 },
          { label: '8 - Very severely', value: 8 }
        ]
      }
    ]
  },
  {
    id: 'ASS-04',
    title: 'Patient Health Questionnaire-9',
    acronym: 'PHQ-9',
    questionCount: 9,
    targetCondition: 'Depression Severity',
    category: 'Depression',
    timesCompleted: 2120,
    type: 'Standard',
    description: 'Standardized 9-question instrument for screening, diagnosing, and tracking depression severity over time.',
    estimatedMinutes: 4,
    validityScore: "Cronbach's α = 0.89",
    targetPopulation: 'Adults (18+)',
    authorOrSource: 'Kroenke, Spitzer & Williams (2001) / Pfizer',
    status: 'Active',
    assignedClientCount: 620,
    createdAt: '2025-01-01',
    severityRanges: [
      { minScore: 0, maxScore: 4, label: 'Minimal / None', color: 'bg-emerald-500', clinicalAction: 'No intervention required. Continue routine wellness tracking.' },
      { minScore: 5, maxScore: 9, label: 'Mild Depression', color: 'bg-amber-500', clinicalAction: 'Watchful waiting; repeat PHQ-9 at follow-up. Psychoeducation recommended.' },
      { minScore: 10, maxScore: 14, label: 'Moderate Depression', color: 'bg-orange-500', clinicalAction: 'Consider counseling, psychotherapy, or pharmacotherapy consult.' },
      { minScore: 15, maxScore: 19, label: 'Moderately Severe', color: 'bg-rose-600', clinicalAction: 'Active psychotherapy and/or pharmacotherapy strongly indicated.' },
      { minScore: 20, maxScore: 27, label: 'Severe Depression', color: 'bg-purple-600', clinicalAction: 'Immediate clinical evaluation and referral to specialty psychiatric care.' }
    ],
    questions: [
      {
        id: 'q1',
        text: 'Little interest or pleasure in doing things',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'q2',
        text: 'Feeling down, depressed, or hopeless',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'q3',
        text: 'Trouble falling or staying asleep, or sleeping too much',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'q4',
        text: 'Feeling tired or having little energy',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'q5',
        text: 'Poor appetite or overeating',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'q6',
        text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'q7',
        text: 'Trouble concentrating on things, such as reading the newspaper or watching television',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'q8',
        text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'q9',
        text: 'Thoughts that you would be better off dead or of hurting yourself in some way',
        subtext: 'CRITICAL SAFETY RISK TRIGGER QUESTION',
        isRiskTrigger: true,
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      }
    ]
  },
  {
    id: 'ASS-05',
    title: 'Generalized Anxiety Disorder-7',
    acronym: 'GAD-7',
    questionCount: 7,
    targetCondition: 'Anxiety Severity',
    category: 'Anxiety',
    timesCompleted: 1890,
    type: 'Standard',
    description: '7-item self-report questionnaire measuring generalized anxiety disorder symptoms over the past 14 days.',
    estimatedMinutes: 4,
    validityScore: "Cronbach's α = 0.92",
    targetPopulation: 'Adults & Adolescents (12+)',
    authorOrSource: 'Spitzer, Kroenke, Williams et al. (2006)',
    status: 'Active',
    assignedClientCount: 520,
    createdAt: '2025-01-10',
    severityRanges: [
      { minScore: 0, maxScore: 4, label: 'Minimal Anxiety', color: 'bg-emerald-500', clinicalAction: 'No treatment indicated.' },
      { minScore: 5, maxScore: 9, label: 'Mild Anxiety', color: 'bg-amber-500', clinicalAction: 'Monitor symptoms; introduce breathing & relaxation techniques.' },
      { minScore: 10, maxScore: 14, label: 'Moderate Anxiety', color: 'bg-orange-500', clinicalAction: 'CBT protocol recommended; assess impact on daily functioning.' },
      { minScore: 15, maxScore: 21, label: 'Severe Anxiety', color: 'bg-rose-600', clinicalAction: 'Active clinical intervention and medical/psychiatric evaluation.' }
    ],
    questions: [
      {
        id: 'g1',
        text: 'Feeling nervous, anxious, or on edge',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'g2',
        text: 'Not being able to stop or control worrying',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'g3',
        text: 'Worrying too much about different things',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'g4',
        text: 'Trouble relaxing',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'g5',
        text: 'Being so restless that it is hard to sit still',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'g6',
        text: 'Becoming easily annoyed or irritable',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      },
      {
        id: 'g7',
        text: 'Feeling afraid as if something awful might happen',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ]
      }
    ]
  },
  {
    id: 'ASS-06',
    title: 'PTSD Checklist for DSM-5',
    acronym: 'PCL-5',
    questionCount: 20,
    targetCondition: 'PTSD Severity',
    category: 'PTSD & Trauma',
    timesCompleted: 780,
    type: 'Standard',
    description: '20-item self-report measure assessing the 20 DSM-5 symptoms of PTSD. Cutoff score of 33 for provisional diagnosis.',
    estimatedMinutes: 8,
    validityScore: "Cronbach's α = 0.94",
    targetPopulation: 'Trauma Survivors & Adults',
    authorOrSource: 'Weathers et al. (2013) / VA National Center for PTSD',
    status: 'Active',
    assignedClientCount: 240,
    createdAt: '2025-01-20',
    severityRanges: [
      { minScore: 0, maxScore: 32, label: 'Subclinical Symptoms', color: 'bg-emerald-500', clinicalAction: 'Does not meet provisional cut-point threshold.' },
      { minScore: 33, maxScore: 45, label: 'Moderate PTSD (Provisional Diagnosis)', color: 'bg-amber-500', clinicalAction: 'Meets provisional diagnosis cutoff. Structured CAPS-5 clinical evaluation indicated.' },
      { minScore: 46, maxScore: 80, label: 'Severe PTSD Symptoms', color: 'bg-rose-600', clinicalAction: 'High symptom burden. Trauma-focused psychotherapy (EMDR / CPT) indicated.' }
    ],
    questions: [
      { id: 'p1', text: 'Repeated, disturbing, and unwanted memories of the stressful experience?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p2', text: 'Repeated, disturbing dreams of the stressful experience?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p3', text: 'Suddenly feeling or acting as if the stressful experience were actually happening again?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p4', text: 'Feeling very upset when something reminded you of the stressful experience?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p5', text: 'Having strong physical reactions when something reminded you of the stressful experience?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p6', text: 'Avoiding memories, thoughts, or feelings related to the stressful experience?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p7', text: 'Avoiding external reminders of the stressful experience (people, places, conversations)?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p8', text: 'Trouble remembering important parts of the stressful experience?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p9', text: 'Having strong negative beliefs about yourself, other people, or the world?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p10', text: 'Blaming yourself or someone else for the stressful experience or what happened after it?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p11', text: 'Having strong negative feelings such as fear, horror, anger, guilt, or shame?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p12', text: 'Loss of interest in activities that you used to enjoy?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p13', text: 'Feeling distant or cut off from other people?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p14', text: 'Trouble experiencing positive feelings (unable to feel happiness or loving feelings)?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p15', text: 'Irritable behavior, angry outbursts, or acting aggressively?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p16', text: 'Taking too many risks or doing things that could cause you harm?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p17', text: 'Being \'super alert\' or watchful or on guard?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p18', text: 'Feeling jumpy or easily startled?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p19', text: 'Having difficulty concentrating?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p20', text: 'Trouble falling or staying asleep?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] }
    ]
  },
  {
    id: 'ASS-07',
    title: 'Obsessive-Compulsive Inventory - Revised',
    acronym: 'OCI-R',
    questionCount: 18,
    targetCondition: 'OCD Symptoms',
    category: 'OCD',
    timesCompleted: 640,
    type: 'Standard',
    description: '18-item self-report scale assessing symptoms of Obsessive-Compulsive Disorder across 6 subscales. Recommended cutoff score is 21.',
    estimatedMinutes: 6,
    validityScore: "Cronbach's α = 0.90",
    targetPopulation: 'Adults (18+)',
    authorOrSource: 'Foa, Huppert, Leiberg et al. (2002)',
    status: 'Active',
    assignedClientCount: 195,
    createdAt: '2025-01-25',
    severityRanges: [
      { minScore: 0, maxScore: 20, label: 'Subclinical OCD Symptoms', color: 'bg-emerald-500', clinicalAction: 'Does not exceed recommended cutoff threshold.' },
      { minScore: 21, maxScore: 40, label: 'Clinical OCD Elevation', color: 'bg-amber-500', clinicalAction: 'Exceeds recommended cutoff (≥21). Clinical interview for OCD indicated.' },
      { minScore: 41, maxScore: 72, label: 'Severe OCD Impairment', color: 'bg-rose-600', clinicalAction: 'High symptom severity. Exposure and Response Prevention (ERP) protocol recommended.' }
    ],
    questions: [
      { id: 'o1', text: 'I have saved up so many things that they get in the way.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o2', text: 'I check things more often than necessary.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o3', text: 'I get upset if objects are not arranged properly.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o4', text: 'I feel compelled to count while I am doing things.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o5', text: 'I find it difficult to touch an object when I know it has been touched by strangers or certain people.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o6', text: 'I find it difficult to control my own thoughts.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o7', text: 'I collect things I don\'t need.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o8', text: 'I repeatedly check doors, windows, drawers, etc.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o9', text: 'I get upset if others change the way I have arranged things.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o10', text: 'I feel I have to repeat certain numbers.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o11', text: 'I sometimes have to wash or clean myself simply because I feel contaminated.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o12', text: 'I am upset by unpleasant thoughts that come into my mind against my will.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o13', text: 'I avoid throwing things away because I am afraid I might need them later.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o14', text: 'I repeatedly check gas and water taps and light switches after turning them off.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o15', text: 'I need things to be arranged in a particular way.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o16', text: 'I feel that there are good and bad numbers.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o17', text: 'I wash my hands more often and longer than necessary.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'o18', text: 'I frequently get nasty thoughts and have difficulty in getting rid of them.', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'A lot (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] }
    ]
  },
  {
    id: 'ASS-08',
    title: 'Adult ADHD Self-Report Scale v1.1',
    acronym: 'ASRS v1.1',
    questionCount: 18,
    targetCondition: 'Adult ADHD',
    category: 'ADHD',
    timesCompleted: 870,
    type: 'Standard',
    description: '18-question self-report scale developed with WHO assessing symptoms of Adult ADHD. Part A (Q1–6) serves as primary screener.',
    estimatedMinutes: 6,
    validityScore: "Cronbach's α = 0.89",
    targetPopulation: 'Adults (18+)',
    authorOrSource: 'Kessler, Adler et al. (2005) / WHO',
    status: 'Active',
    assignedClientCount: 310,
    createdAt: '2025-01-30',
    severityRanges: [
      { minScore: 0, maxScore: 3, label: 'Unlikely ADHD', color: 'bg-emerald-500', clinicalAction: 'Symptoms not consistent with Adult ADHD threshold.' },
      { minScore: 4, maxScore: 6, label: 'Likely Adult ADHD (Part A Criterion Met)', color: 'bg-rose-600', clinicalAction: 'Part A screening criterion met (≥4 shaded items). Comprehensive ADHD clinical evaluation recommended.' }
    ],
    questions: [
      { id: 'a1', text: 'Part A - How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (1)', value: 1 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a2', text: 'How often do you have difficulty getting things in order when you have to do a task that requires organisation?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (1)', value: 1 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a3', text: 'How often do you have problems remembering appointments or obligations?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (1)', value: 1 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a4', text: 'When you have a task that requires a lot of thought, how often do you avoid or delay getting started?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (0)', value: 0 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a5', text: 'How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (0)', value: 0 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a6', text: 'How often do you feel overly active and compelled to do things, like you were driven by a motor?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (0)', value: 0 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a7', text: 'Part B - How often do you make careless mistakes when you have to work on a boring or difficult project?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (0)', value: 0 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a8', text: 'How often do you have difficulty keeping your attention when you are doing boring or repetitive work?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (0)', value: 0 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a9', text: 'How often do you have difficulty concentrating on what people say to you, even when they are speaking to you directly?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (1)', value: 1 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a10', text: 'How often do you misplace or have difficulty finding things at home or at work?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (0)', value: 0 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a11', text: 'How often are you distracted by activity or noise around you?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (0)', value: 0 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a12', text: 'How often do you leave your seat in meetings or other situations in which you are expected to remain seated?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (1)', value: 1 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a13', text: 'How often do you feel restless or fidgety?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (0)', value: 0 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a14', text: 'How often do you have difficulty unwinding and relaxing when you have time to yourself?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (0)', value: 0 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a15', text: 'How often do you find yourself talking too much when you are in social situations?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (0)', value: 0 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a16', text: 'When you\'re in a conversation, how often do you find yourself finishing the sentences of the people you are talking to?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (1)', value: 1 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a17', text: 'How often do you have difficulty waiting your turn in situations when turn taking is required?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (0)', value: 0 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a18', text: 'How often do you interrupt others when they are busy?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (1)', value: 1 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] }
    ]
  }
];

export const mockAssessmentSubmissions: AssessmentSubmission[] = [
  {
    id: 'SUB-901',
    assessmentId: 'ASS-01',
    assessmentAcronym: 'PHQ-9',
    assessmentTitle: 'Patient Health Questionnaire-9',
    clientId: 'CL-101',
    clientName: 'Sarah Jenkins',
    clientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    therapistName: 'Dr. Alex Harrison',
    completedAt: '2026-08-01 14:32',
    totalScore: 16,
    maxScore: 27,
    severityLabel: 'Moderately Severe',
    severityColor: 'bg-red-500 text-white',
    flaggedRisk: true,
    answers: [
      { questionId: 'q1', questionText: 'Little interest or pleasure', answerLabel: 'More than half the days (2)', score: 2 },
      { questionId: 'q2', questionText: 'Feeling down, depressed', answerLabel: 'Nearly every day (3)', score: 3 },
      { questionId: 'q9', questionText: 'Thoughts of self-harm', answerLabel: 'Several days (1)', score: 1 }
    ]
  },
  {
    id: 'SUB-902',
    assessmentId: 'ASS-02',
    assessmentAcronym: 'GAD-7',
    assessmentTitle: 'Generalized Anxiety Disorder-7',
    clientId: 'CL-102',
    clientName: 'Michael Chen',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    therapistName: 'Dr. Elena Rostova',
    completedAt: '2026-08-01 11:15',
    totalScore: 8,
    maxScore: 21,
    severityLabel: 'Mild Anxiety',
    severityColor: 'bg-amber-500 text-white',
    flaggedRisk: false,
    answers: [
      { questionId: 'g1', questionText: 'Feeling nervous or on edge', answerLabel: 'Several days (1)', score: 1 },
      { questionId: 'g2', questionText: 'Uncontrolled worrying', answerLabel: 'More than half the days (2)', score: 2 }
    ]
  },
  {
    id: 'SUB-903',
    assessmentId: 'ASS-01',
    assessmentAcronym: 'PHQ-9',
    assessmentTitle: 'Patient Health Questionnaire-9',
    clientId: 'CL-103',
    clientName: 'Priya Sharma',
    clientAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    therapistName: 'Marcus Vance',
    completedAt: '2026-07-30 09:40',
    totalScore: 3,
    maxScore: 27,
    severityLabel: 'Minimal Depression',
    severityColor: 'bg-emerald-500 text-white',
    flaggedRisk: false,
    answers: []
  },
  {
    id: 'SUB-904',
    assessmentId: 'ASS-04',
    assessmentAcronym: 'ISI',
    assessmentTitle: 'Insomnia Severity Index',
    clientId: 'CL-104',
    clientName: 'Emily Watson',
    clientAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    therapistName: 'Dr. Elena Rostova',
    completedAt: '2026-07-28 18:05',
    totalScore: 19,
    maxScore: 28,
    severityLabel: 'Clinical Insomnia (Moderate)',
    severityColor: 'bg-orange-500 text-white',
    flaggedRisk: false,
    answers: []
  }
];

export const mockAssessmentAssignments: AssessmentAssignment[] = [
  {
    id: 'ASN-301',
    assessmentId: 'ASS-01',
    assessmentAcronym: 'PHQ-9',
    assessmentTitle: 'Patient Health Questionnaire-9',
    clientId: 'CL-101',
    clientName: 'Sarah Jenkins',
    clientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    therapistName: 'Dr. Alex Harrison',
    assignedDate: '2026-08-01',
    dueDate: '2026-08-08',
    frequency: 'Weekly',
    status: 'Pending'
  },
  {
    id: 'ASN-302',
    assessmentId: 'ASS-02',
    assessmentAcronym: 'GAD-7',
    assessmentTitle: 'Generalized Anxiety Disorder-7',
    clientId: 'CL-105',
    clientName: 'Robert Garcia',
    clientAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    therapistName: 'Sophia Lin',
    assignedDate: '2026-07-29',
    dueDate: '2026-08-05',
    frequency: 'Bi-weekly',
    status: 'Overdue'
  }
];

export const mockMediaAssets: MediaAsset[] = [
  { id: 'AST-1', name: 'Mindfulness_Guide_Banner.png', type: 'Banner', url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400', size: '2.4 MB', uploadedDate: '2026-07-25', category: 'Banner' },
  { id: 'AST-2', name: 'Sleep_Hygiene_Worksheet.pdf', type: 'Professional', url: '#', size: '850 KB', uploadedDate: '2026-07-20', category: 'Professional' },
  { id: 'AST-3', name: 'Guided_Breathwork_Audio.mp3', type: 'Consultant', url: '#', size: '14.2 MB', uploadedDate: '2026-07-18', category: 'Consultant' },
  { id: 'AST-4', name: 'CBT_Session_Explainer.mp4', type: 'Blog', url: '#', size: '48.5 MB', uploadedDate: '2026-07-12', category: 'Blog' }
];

export const mockProfessions: ProfessionService[] = [
  {
    id: 'PROF-1',
    serviceName: 'Individual Therapy',
    identifier: 'individual-therapy',
    slug: 'individual-therapy',
    status: 'Active',
    description: 'One-on-one evidence-based psychotherapy for anxiety, depression, trauma, and personal growth.',
    imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400',
    imageAltText: 'A licensed therapist listening attentively to a client in a calm setting',
    heroBannerUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800',
    heroBannerTitle: 'Transform Your Mental Well-being With Individual Therapy',
    faqs: [
      { question: 'How long is each session?', answer: 'Standard sessions are 50-60 minutes in length.' },
      { question: 'Are sessions confidential?', answer: 'Yes, all interactions strictly adhere to HIPAA and clinical privacy protocols.' }
    ],
    consultationFee: 2500,
    sessionDurationMinutes: 60,
    visibility: 'Public',
    seo: {
      metaTitle: 'Online Individual Therapy & Counseling | Hexpertify',
      metaDescription: 'Connect with licensed clinical psychologists for confidential online individual therapy.',
      keywords: 'individual therapy, online therapist, CBT counseling, mental health',
      canonicalUrl: 'https://hexpertify.com/services/individual-therapy',
      openGraphTitle: 'Individual Psychotherapy on Hexpertify',
      openGraphDescription: 'Discover evidence-based individual therapy with licensed psychologists on Hexpertify. Book your first session today.',
      openGraphImageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200',
      openGraphImageAltText: 'A licensed therapist in a calm consultation room, welcoming a client',
      structuredDataJson: '{"@context":"https://schema.org","@type":"Service","name":"Individual Therapy"}'
    }
  },
  {
    id: 'PROF-2',
    serviceName: 'Couple Therapy',
    identifier: 'couple-therapy',
    slug: 'couple-therapy',
    status: 'Active',
    description: 'Specialized relationship counseling to restore trust, communication, and emotional connection.',
    imageUrl: 'https://images.unsplash.com/photo-1516585427167-9f4af9627e6c?w=400',
    imageAltText: 'A couple sitting together working through challenges with a therapist',
    heroBannerUrl: 'https://images.unsplash.com/photo-1516585427167-9f4af9627e6c?w=800',
    heroBannerTitle: 'Rebuild Connection — Expert Couple Therapy Sessions',
    faqs: [
      { question: 'Do both partners need to attend?', answer: 'Yes, both partners participate together in most sessions.' }
    ],
    consultationFee: 3500,
    sessionDurationMinutes: 60,
    visibility: 'Public',
    seo: {
      metaTitle: 'Online Marriage & Relationship Counseling | Hexpertify',
      metaDescription: 'Strengthen your partnership with expert Gottman-certified couples therapists.',
      keywords: 'couples therapy, marriage counseling, Gottman method, relationship advice',
      canonicalUrl: 'https://hexpertify.com/services/couple-therapy',
      openGraphTitle: 'Couples Counseling Services',
      openGraphDescription: 'Rebuild trust and communication with expert Gottman-certified couples therapists on Hexpertify.',
      openGraphImageUrl: 'https://images.unsplash.com/photo-1516585427167-9f4af9627e6c?w=1200',
      openGraphImageAltText: 'A couple in therapy, rebuilding connection with a professional counselor',
      structuredDataJson: '{"@context":"https://schema.org","@type":"Service","name":"Couple Therapy"}'
    }
  },
  {
    id: 'PROF-3',
    serviceName: 'Licensed Clinical Psychologist',
    identifier: 'clinical-psychologist',
    slug: 'clinical-psychologist',
    status: 'Active',
    description: 'Evidence-based cognitive behavioral therapy, mood disorder treatment, and psychological assessments.',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
    imageAltText: 'Licensed clinical psychologist conducting a session',
    heroBannerUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
    heroBannerTitle: 'Expert Care With Licensed Clinical Psychologists',
    faqs: [],
    consultationFee: 2800,
    sessionDurationMinutes: 60,
    visibility: 'Public'
  },
  {
    id: 'PROF-4',
    serviceName: 'Marriage & Family Therapist',
    identifier: 'marriage-family-therapist',
    slug: 'marriage-family-therapist',
    status: 'Active',
    description: 'Relational dynamics, family systems counseling, and conflict resolution.',
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
    imageAltText: 'Marriage and family therapist in consultation room',
    heroBannerUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800',
    heroBannerTitle: 'Strengthen Family & Relationship Connection',
    faqs: [],
    consultationFee: 3200,
    sessionDurationMinutes: 60,
    visibility: 'Public'
  },
  {
    id: 'PROF-5',
    serviceName: 'Adolescent & Teen Counselor',
    identifier: 'adolescent-teen-counselor',
    slug: 'adolescent-teen-counselor',
    status: 'Active',
    description: 'Specialized youth counseling for exam stress, identity, peer pressure, and executive function.',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    imageAltText: 'Adolescent and teen counselor during session',
    heroBannerUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
    heroBannerTitle: 'Empowering Youth & Adolescent Mental Well-being',
    faqs: [],
    consultationFee: 2200,
    sessionDurationMinutes: 60,
    visibility: 'Public'
  },
  {
    id: 'PROF-6',
    serviceName: 'Psychiatrist & Neuro-Specialist',
    identifier: 'psychiatrist-neuro-specialist',
    slug: 'psychiatrist-neuro-specialist',
    status: 'Active',
    description: 'Medical psychiatric evaluation, medication management, and neuropsychological care.',
    imageUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400',
    imageAltText: 'Psychiatrist in medical office',
    heroBannerUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800',
    heroBannerTitle: 'Comprehensive Psychiatric & Medical Consultation',
    faqs: [],
    consultationFee: 4000,
    sessionDurationMinutes: 45,
    visibility: 'Public'
  }
];

export const mockHomepageCMS: HomepageCMS = {
  general: {
    pageIdentifier: 'home-page',
    notificationTitle: 'Welcome to Hexpertify - Book Your Therapy Session Online Today'
  },
  carouselImages: [
    {
      id: 'CAR-1',
      imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200',
      altText: 'Professional therapist conducting an online counseling session',
      deviceType: 'Desktop'
    },
    {
      id: 'CAR-2',
      imageUrl: 'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=800',
      altText: 'Mobile view banner for instant therapy booking',
      deviceType: 'Mobile'
    }
  ],
  seo: {
    metaTitle: 'Hexpertify - Premier Online Therapy & Mental Health Platform',
    metaDescription: 'Book confidential video consultation sessions with top licensed clinical psychologists and specialized counselors on Hexpertify.',
    keywords: 'online therapy, mental health platform, licensed psychologists, couple therapy, CBT counseling',
    openGraphTitle: 'Hexpertify — Online Therapy & Counseling Services',
    openGraphDescription: 'Connect with expert clinical psychologists, relationship counselors, and mental health professionals anywhere.',
    openGraphImageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200',
    openGraphImageAltText: 'Hexpertify mental health platform hero banner preview'
  },
  faqs: [
    {
      id: 'FAQ-1',
      question: 'How do I book a session with a therapist on Hexpertify?',
      answer: 'Browse our catalog of verified therapists, filter by specialization or profession, select a convenient time slot, and complete secure payment.'
    },
    {
      id: 'FAQ-2',
      question: 'Are sessions conducted online or in-person?',
      answer: 'All consultations are conducted via end-to-end encrypted high-definition video calls directly in your browser or mobile app.'
    }
  ],
  testimonials: [
    {
      id: 'TEST-1',
      authorName: 'Sarah Jenkins',
      profession: 'Senior Product Designer',
      authorEmail: 'sarah.j@example.com',
      authorImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      authorImageAltText: 'Portrait of Sarah Jenkins',
      content: 'Hexpertify made finding a Gottman-certified couple therapist seamless. The AI intake summary helped us hit the ground running from session one.'
    },
    {
      id: 'TEST-2',
      authorName: 'David Chen',
      profession: 'Software Engineer',
      authorEmail: 'david.chen@example.com',
      authorImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      authorImageAltText: 'Portrait of David Chen',
      content: 'The platform is intuitive, flexible, and completely private. My anxiety score improved significantly after 4 sessions of CBT.'
    }
  ]
};

export const mockAuditLogs: AuditLog[] = [
  { id: 'LOG-881', user: 'Admin (System)', role: 'Super Admin', action: 'Released Payout ₹45,000 to Dr. Alex Harrison', module: 'Payments', timestamp: '2026-07-31 18:24:10', ipAddress: '192.168.1.1' },
  { id: 'LOG-882', user: 'Finance Manager', role: 'Finance Admin', action: 'Exported Monthly Revenue Statement (July 2026)', module: 'Revenue', timestamp: '2026-07-31 16:10:44', ipAddress: '192.168.1.14' },
  { id: 'LOG-883', user: 'Admin (System)', role: 'Super Admin', action: 'Approved License Verification for Marcus Vance', module: 'Therapists', timestamp: '2026-07-30 11:05:22', ipAddress: '192.168.1.1' }
];

export const mockTherapistSlots: TherapistSlot[] = [
  { id: 'SLOT-101', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Monday', startTime: '09:00 AM', endTime: '10:00 AM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Booked', isRecurring: true, bookedByClientName: 'Sarah Jenkins', meetUrl: 'https://meet.google.com/hex-alex-01', notes: 'Weekly CBT Session via Google Meet' },
  { id: 'SLOT-102', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Monday', startTime: '10:30 AM', endTime: '11:30 AM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-alex-02' },
  { id: 'SLOT-103', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Monday', startTime: '02:00 PM', endTime: '03:00 PM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-alex-03' },
  { id: 'SLOT-104', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Monday', startTime: '03:30 PM', endTime: '04:30 PM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Blocked', isRecurring: false, meetUrl: 'https://meet.google.com/hex-alex-04', notes: 'Clinical Case Review Break' },

  { id: 'SLOT-105', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Tuesday', startTime: '09:00 AM', endTime: '10:00 AM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-alex-05' },
  { id: 'SLOT-106', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Tuesday', startTime: '11:00 AM', endTime: '12:00 PM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Booked', isRecurring: true, bookedByClientName: 'David Miller', meetUrl: 'https://meet.google.com/hex-alex-06' },
  { id: 'SLOT-107', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Tuesday', startTime: '02:00 PM', endTime: '03:00 PM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-alex-07' },

  { id: 'SLOT-108', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Wednesday', startTime: '10:00 AM', endTime: '11:00 AM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-alex-08' },
  { id: 'SLOT-109', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Wednesday', startTime: '01:00 PM', endTime: '02:00 PM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-alex-09' },
  { id: 'SLOT-110', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Wednesday', startTime: '04:00 PM', endTime: '05:00 PM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-alex-10' },

  { id: 'SLOT-111', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Thursday', startTime: '09:30 AM', endTime: '10:30 AM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-alex-11' },
  { id: 'SLOT-112', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Thursday', startTime: '11:30 AM', endTime: '12:30 PM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Booked', isRecurring: true, bookedByClientName: 'Amanda Miller', meetUrl: 'https://meet.google.com/hex-alex-12' },

  { id: 'SLOT-113', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Friday', startTime: '10:00 AM', endTime: '11:00 AM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-alex-13' },
  { id: 'SLOT-114', therapistId: 'TH-01', therapistName: 'Dr. Alex Harrison', dayOfWeek: 'Friday', startTime: '03:00 PM', endTime: '04:00 PM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-alex-14' },

  // Slots for Dr. Elena Rostova
  { id: 'SLOT-201', therapistId: 'TH-02', therapistName: 'Dr. Elena Rostova', dayOfWeek: 'Monday', startTime: '10:00 AM', endTime: '11:00 AM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-elena-01' },
  { id: 'SLOT-202', therapistId: 'TH-02', therapistName: 'Dr. Elena Rostova', dayOfWeek: 'Monday', startTime: '11:30 AM', endTime: '12:30 PM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Booked', isRecurring: true, bookedByClientName: 'Michael Chen', meetUrl: 'https://meet.google.com/hex-elena-02' },
  { id: 'SLOT-203', therapistId: 'TH-02', therapistName: 'Dr. Elena Rostova', dayOfWeek: 'Wednesday', startTime: '02:00 PM', endTime: '03:00 PM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-elena-03' },
  { id: 'SLOT-204', therapistId: 'TH-02', therapistName: 'Dr. Elena Rostova', dayOfWeek: 'Friday', startTime: '05:00 PM', endTime: '06:00 PM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Booked', isRecurring: true, bookedByClientName: 'Emily Watson', meetUrl: 'https://meet.google.com/hex-elena-04' },

  // Slots for Marcus Vance
  { id: 'SLOT-301', therapistId: 'TH-03', therapistName: 'Marcus Vance', dayOfWeek: 'Tuesday', startTime: '01:00 PM', endTime: '02:00 PM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Booked', isRecurring: true, bookedByClientName: 'Priya Sharma', meetUrl: 'https://meet.google.com/hex-marcus-01' },
  { id: 'SLOT-302', therapistId: 'TH-03', therapistName: 'Marcus Vance', dayOfWeek: 'Tuesday', startTime: '03:00 PM', endTime: '04:00 PM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-marcus-02' },
  { id: 'SLOT-303', therapistId: 'TH-03', therapistName: 'Marcus Vance', dayOfWeek: 'Thursday', startTime: '10:00 AM', endTime: '11:00 AM', durationMinutes: 60, sessionType: 'Google Meet', status: 'Available', isRecurring: true, meetUrl: 'https://meet.google.com/hex-marcus-03' }
];

export const mockResources: ResourceItem[] = [
  {
    id: 'res-1',
    type: 'article',
    typeLabel: 'ARTICLE',
    category: 'Articles',
    isRecommended: true,
    isSaved: true,
    title: 'Understanding Panic & Somatic Grounding Techniques',
    description: 'Practical step-by-step physical grounding tools to de-escalate panic attacks and physical hyperarousal.',
    fullContent: `Panic attacks can feel overwhelming, but somatic grounding techniques leverage your nervous system's natural calming pathways to restore emotional balance.

### 1. The 5-4-3-2-1 Sensory Grounding Technique
- **5 things you can SEE:** Look around and notice 5 specific visual details.
- **4 things you can TOUCH:** Feel the physical texture of your chair, clothes, or ground.
- **3 things you can HEAR:** Listen closely for subtle ambient sounds.
- **2 things you can SMELL:** Notice any aromas or fresh air.
- **1 thing you can TASTE:** Focus on the taste in your mouth or sip cool water.

### 2. Box Breathing (4-4-4-4)
Inhale for 4 seconds, hold for 4 seconds, exhale for 4 seconds, and pause for 4 seconds. Repeat 4 cycles to stimulate the vagus nerve and slow elevated heart rate.`,
    duration: '5 min read',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
    tags: ['Grounding', 'Panic De-escalation', 'Somatic', 'CBT']
  },
  {
    id: 'res-2',
    type: 'worksheet',
    typeLabel: 'WORKSHEET',
    category: 'Worksheets',
    isRecommended: true,
    isSaved: true,
    title: 'Cognitive Distortions Reference Guide & Worksheet',
    description: 'Identify and reframe the 10 most common unhelpful thinking habits with real-life examples.',
    fullContent: `Cognitive distortions are biased ways of thinking that reinforce negative emotions. Use this guide to identify automatic thoughts and reframe them into objective perspectives.

### Common Distortions Covered:
1. **All-or-Nothing Thinking:** Seeing things in black-and-white categories.
2. **Catastrophizing:** Expecting the worst possible outcome.
3. **Mind Reading:** Assuming you know what others are thinking without evidence.
4. **Emotional Reasoning:** Assuming feelings reflect objective reality ("I feel anxious, so it must be dangerous").

### Practical Reframing Exercise:
Write down the triggering situation, your automatic thought, the cognitive distortion type, and an alternative balanced thought.`,
    duration: '8 min read',
    imageUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80',
    tags: ['CBT', 'Reframing', 'Cognitive Health', 'Self-Reflection']
  },
  {
    id: 'res-3',
    type: 'meditation',
    typeLabel: 'MEDITATION',
    category: 'Meditations',
    isRecommended: false,
    isSaved: false,
    title: '15-Minute Progressive Muscle Relaxation (PMR)',
    description: 'Guided audio session systematically tensing and relaxing major muscle groups to release somatic tension.',
    fullContent: `Progressive Muscle Relaxation (PMR) is an evidence-based exercise designed to reduce muscular tension and sympathetic nervous system activation.

### Guided Steps:
1. Sit or lie down comfortably in a quiet room.
2. Tense your toes and feet firmly for 5 seconds, then suddenly release completely. Notice the sensation of warmth and relaxation.
3. Move systematically upward through calf muscles, thighs, abdomen, chest, shoulders, arms, hands, neck, and face.
4. Conclude with 3 deep abdominal breaths, enjoying total body lightness.`,
    duration: '15 min listen',
    imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80',
    tags: ['Mindfulness', 'PMR', 'Stress Release', 'Body Scan']
  },
  {
    id: 'res-4',
    type: 'video',
    typeLabel: 'VIDEO',
    category: 'Videos',
    isRecommended: true,
    isSaved: false,
    title: 'Diaphragmatic Breathing & Vagus Nerve Stimulation',
    description: 'Visual walkthrough and biofeedback demonstration for activating the parasympathetic nervous system.',
    fullContent: `Diaphragmatic breathing (belly breathing) expands the diaphragm, pulling air deep into the lower lungs and signaling safety to the autonomic nervous system.

### Key Takeaways:
- Place one hand on your upper chest and the other on your abdomen.
- Breathe in slowly through your nose so your abdominal hand rises while your chest hand stays quiet.
- Exhale slowly through pursed lips, allowing abdominal muscles to collapse inward.
- Practicing 5–10 minutes daily lowers cortisol levels and improves baseline heart rate variability (HRV).`,
    duration: '10 min video',
    imageUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80',
    tags: ['Vagus Nerve', 'Breathing', 'Biofeedback', 'Autonomic Relief']
  },
  {
    id: 'res-5',
    type: 'pdf',
    typeLabel: 'PDF',
    category: 'PDFs',
    isRecommended: false,
    isSaved: false,
    title: 'Sleep Hygiene & Circadian Rhythm Protocol',
    description: 'Evidence-based checklist for evening wind-down rituals, light exposure management, and sleep tracking.',
    fullContent: `Quality sleep is foundational for emotional regulation and cognitive health. This protocol provides non-pharmacological guidelines for restorative rest.

### Core Guidelines:
- **Morning Sunlight:** Get 10–15 minutes of direct sunlight within 1 hour of waking.
- **Screen Cutoff:** Turn off blue-light emitting screens 60 minutes before bed.
- **Temperature Control:** Keep bedroom cool (around 65°F / 18°C).
- **Consistent Wake Time:** Wake up at the same time daily, even on weekends.`,
    duration: '6 min read',
    imageUrl: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=800&q=80',
    tags: ['Sleep', 'Circadian Rhythm', 'Wellness', 'Checklist']
  },
  {
    id: 'res-6',
    type: 'worksheet',
    typeLabel: 'WORKSHEET',
    category: 'Worksheets',
    isRecommended: false,
    isSaved: false,
    title: '5-Column CBT Thought Record & Restructuring',
    description: 'Structured exercise to log distressing situations, catch automatic thoughts, and form balanced perspectives.',
    fullContent: `The 5-Column Thought Record is one of the most effective tools in Cognitive Behavioral Therapy for modifying unhelpful thought patterns.

### Column Structure:
1. **Situation:** Who, what, when, where?
2. **Automatic Thought:** What thoughts or images went through your mind? (Rate belief 0–100%)
3. **Emotion:** What did you feel? (Rate intensity 0–100%)
4. **Evidence:** Facts supporting vs. facts contradicting the automatic thought.
5. **Alternative Thought:** Objective, realistic perspective (Re-rate emotion intensity).`,
    duration: '12 min read',
    imageUrl: 'https://images.unsplash.com/photo-1499209974431-9dac3ada00d7?auto=format&fit=crop&w=800&q=80',
    tags: ['CBT', 'Thought Record', 'Restructuring', 'Journaling']
  }
];