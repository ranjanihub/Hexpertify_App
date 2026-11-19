import { connectToDatabase, closeDatabase } from '../db/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

async function seed() {
  console.log('====================================================');
  console.log(' HEXPERTIFY: SEEDING 100 CLIENTS & 10 CONSULTANTS   ');
  console.log('====================================================');

  const db = await connectToDatabase();

  // 1. SAFETY BACKUP
  const backupDir = path.resolve(__dirname, '../../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const cols = await db.listCollections().toArray();
  const backupData: Record<string, any[]> = {};
  for (const c of cols) {
    backupData[c.name] = await db.collection<any>(c.name).find({}).toArray();
  }
  const backupFile = path.join(backupDir, `db_backup_before_client_consultant_seed_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`📦 [Safety Backup Created] ${backupFile}`);

  const hashedPassword = await bcrypt.hash('password123', 10);
  const adminHashedPassword = await bcrypt.hash('admin123', 10);

  // 2. PROFESSIONS DEFINITIONS (10 Clinical Specialties)
  const rawProfessions = [
    {
      id: 'prof-clinical-psych',
      identifier: 'clinical-psychology',
      name: 'Clinical Psychology',
      slug: 'clinical-psychology',
      icon: 'Brain',
      description: 'Comprehensive assessment and evidence-based psychotherapy for mood disorders, anxiety, and depression.',
      therapistCount: 15
    },
    {
      id: 'prof-cbt-mindfulness',
      identifier: 'cbt-mindfulness',
      name: 'CBT & Mindfulness Therapy',
      slug: 'cbt-mindfulness',
      icon: 'HeartPulse',
      description: 'Cognitive behavioral restructuring, somatic mindfulness regulation, and stress inoculation techniques.',
      therapistCount: 18
    },
    {
      id: 'prof-child-adolescent',
      identifier: 'child-adolescent',
      name: 'Child & Adolescent Counseling',
      slug: 'child-adolescent',
      icon: 'Smile',
      description: 'Specialized developmental and behavioral therapy for children, teenagers, and family systems.',
      therapistCount: 10
    },
    {
      id: 'prof-neuropsychiatry',
      identifier: 'psychiatry',
      name: 'Psychiatry & Neuropsychiatry',
      slug: 'psychiatry',
      icon: 'Activity',
      description: 'Comprehensive neurobiological mental healthcare, diagnostic evaluations, and neuropsychiatry.',
      therapistCount: 12
    },
    {
      id: 'prof-trauma-emdr',
      identifier: 'trauma-emdr',
      name: 'Trauma Recovery & EMDR',
      slug: 'trauma-emdr',
      icon: 'Shield',
      description: 'Trauma-informed processing, PTSD recovery protocols, and Eye Movement Desensitization and Reprocessing.',
      therapistCount: 11
    },
    {
      id: 'prof-couples-family',
      identifier: 'couples-family',
      name: 'Couples & Relationship Therapy',
      slug: 'couples-family',
      icon: 'Users',
      description: 'Gottman Method, Emotionally Focused Therapy (EFT), conflict resolution, and marital intimacy restoration.',
      therapistCount: 14
    },
    {
      id: 'prof-integrative-holistic',
      identifier: 'integrative-holistic',
      name: 'Holistic & Integrative Psychotherapy',
      slug: 'integrative-holistic',
      icon: 'Sun',
      description: 'Mind-body alignment, somatic experiencing, compassion-focused therapy, and nervous system regulation.',
      therapistCount: 9
    },
    {
      id: 'prof-addiction-behavioral',
      identifier: 'addiction-behavioral',
      name: 'Addiction & Behavioral Health',
      slug: 'addiction-behavioral',
      icon: 'LifeBuoy',
      description: 'Evidence-based recovery counseling for substance dependencies, digital burnout, and impulse disorders.',
      therapistCount: 8
    },
    {
      id: 'prof-peak-performance',
      identifier: 'peak-performance',
      name: 'Stress, Burnout & Peak Performance',
      slug: 'peak-performance',
      icon: 'TrendingUp',
      description: 'Executive mental resilience coaching, imposter syndrome management, and cognitive endurance optimization.',
      therapistCount: 13
    },
    {
      id: 'prof-grief-geriatric',
      identifier: 'grief-transitions',
      name: 'Grief, Loss & Life Transitions',
      slug: 'grief-transitions',
      icon: 'Feather',
      description: 'Compassionate bereavement counseling, major life adjustment therapy, and existential acceptance support.',
      therapistCount: 9
    }
  ];

  const seoMetas: any[] = [];
  const professions = rawProfessions.map(p => {
    const sId = new ObjectId().toString();
    seoMetas.push({
      _id: sId,
      id: sId,
      metaTitle: `${p.name} | Hexpertify Mental Healthcare`,
      metaDescription: p.description,
      metaKeywords: [p.slug, 'therapy', 'mental-health', 'hexpertify', 'psychology'],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return {
      ...p,
      _id: p.id,
      seoMetaId: sId,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date()
    };
  });

  // 3. THE 10 LICENSED CONSULTANTS
  const rawTherapists = [
    {
      id: 'doc-1',
      identifier: 'evelyn-reed',
      name: 'Dr. Evelyn Reed',
      email: 'dr.evelyn@hexpertify.com',
      alternateEmail: 'evelyn.reed@example.com',
      role: 'CONSULTANT',
      profession: 'Clinical Psychology',
      professionId: 'prof-clinical-psych',
      title: 'Licensed Clinical Psychologist, PhD',
      specialization: 'Mood Disorders, Panic Anxiety, CBT & Somatic Regulation',
      experience: 12,
      yearsOfExperience: 12,
      experienceYears: 12,
      rating: 4.96,
      reviewCount: 48,
      hourlyRate: 1500,
      fee: 1500,
      fees: 1500,
      minPrice: 1500,
      platformFeePerSession: 1500,
      bio: 'Dr. Evelyn Reed is a licensed clinical psychologist with over 12 years of clinical experience specializing in evidence-based CBT, somatic nervous system regulation, and mindfulness therapies.',
      about: 'Dr. Evelyn Reed holds a doctorate from Stanford University and provides compassionate, non-judgmental psychotherapeutic interventions for acute anxiety, depression, and stress loops.',
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      avatarInitials: 'ER',
      status: 'ACTIVE',
      accountStatus: 'Active',
      verificationStatus: 'Verified',
      isCertified: true,
      licenseNumber: 'PSY-CA-48291',
      languages: ['English', 'Spanish'],
      education: 'PhD in Clinical Psychology, Stanford University',
      qualifications: ['PhD in Clinical Psychology, Stanford', 'Licensed Clinical Psychologist (LCP)', 'Board Certified CBT Practitioner'],
      specialties: ['Mood Disorders', 'Panic Anxiety', 'CBT & Somatic Regulation', 'Stress Inoculation'],
      activeClientsCount: 12,
      clientsServed: 180,
      totalSessions: 240,
      totalRevenue: 360000,
      therapyHours: 210,
      outcomes: { clientImprovementScore: 94, goalAchievementRate: 91, homeworkAdherenceRate: 88, attendanceRate: 98 },
      services: [
        { id: 'srv-1', serviceName: 'Individual Psychotherapy & CBT Session', durationMinutes: 50, sessionFee: 1500, platformFee: 1500, platform: 'Google Meet', description: 'One-on-one virtual psychological consultation focusing on evidence-based cognitive restructuring.' }
      ],
      availability: {
        Monday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        Tuesday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        Wednesday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        Thursday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        Friday: ['09:00', '10:00', '11:00', '14:00', '15:00'],
        Saturday: ['10:00', '11:00', '12:00'],
        Sunday: []
      }
    },
    {
      id: 'doc-2',
      identifier: 'marcus-vance',
      name: 'Dr. Marcus Vance',
      email: 'marcus.vance@hexpertify.com',
      alternateEmail: 'dr.marcus@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'CBT & Mindfulness Therapy',
      professionId: 'prof-cbt-mindfulness',
      title: 'Senior Clinical Psychologist (CBT & Somatic Care)',
      specialization: 'Cognitive Behavioral Therapy, General Anxiety, Work Burnout',
      experience: 9,
      yearsOfExperience: 9,
      experienceYears: 9,
      rating: 4.92,
      reviewCount: 36,
      hourlyRate: 1400,
      fee: 1400,
      fees: 1400,
      minPrice: 1400,
      platformFeePerSession: 1400,
      bio: 'Specializing in CBT and performance anxiety, Dr. Vance helps clients break negative thought cycles and develop sustainable emotional resilience.',
      about: 'Doctorate in Psychology from Columbia University. Dr. Vance combines third-wave CBT with practical breathwork and habit re-engineering.',
      image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
      photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
      avatarInitials: 'MV',
      status: 'ACTIVE',
      accountStatus: 'Active',
      verificationStatus: 'Verified',
      isCertified: true,
      licenseNumber: 'PSY-NY-91823',
      languages: ['English', 'German'],
      education: 'PsyD in Clinical Psychology, Columbia University',
      qualifications: ['PsyD, Columbia University', 'Certified Cognitive Behavioral Therapist', 'Member APA'],
      specialties: ['Cognitive Behavioral Therapy', 'General Anxiety', 'Work Burnout', 'Intrusive Thoughts'],
      activeClientsCount: 11,
      clientsServed: 145,
      totalSessions: 190,
      totalRevenue: 266000,
      therapyHours: 165,
      outcomes: { clientImprovementScore: 92, goalAchievementRate: 89, homeworkAdherenceRate: 85, attendanceRate: 96 },
      services: [
        { id: 'srv-2', serviceName: 'Anxiety & Panic Restructuring Consultation', durationMinutes: 50, sessionFee: 1400, platformFee: 1400, platform: 'Google Meet', description: 'Targeted behavioral intervention to deactivate acute panic loops and somatic hyperarousal.' }
      ],
      availability: {
        Monday: ['10:00', '11:00', '13:00', '15:00', '16:00'],
        Tuesday: ['10:00', '11:00', '13:00', '15:00', '16:00'],
        Wednesday: ['10:00', '11:00', '14:00', '15:00'],
        Thursday: ['10:00', '11:00', '14:00', '15:00', '17:00'],
        Friday: ['10:00', '11:00', '12:00'],
        Saturday: ['11:00', '12:00'],
        Sunday: []
      }
    },
    {
      id: 'doc-3',
      identifier: 'sarah-jenkins',
      name: 'Dr. Sarah Jenkins',
      email: 'sarah.jenkins@hexpertify.com',
      alternateEmail: 'dr.sarah@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'Child & Adolescent Counseling',
      professionId: 'prof-child-adolescent',
      title: 'Pediatric & Family Therapist, PsyD',
      specialization: 'Adolescent Anxiety, Family Systems, ADHD Behavioral Support',
      experience: 11,
      yearsOfExperience: 11,
      experienceYears: 11,
      rating: 4.95,
      reviewCount: 41,
      hourlyRate: 1600,
      fee: 1600,
      fees: 1600,
      minPrice: 1600,
      platformFeePerSession: 1600,
      bio: 'Compassionate care for adolescents, young adults, and parents navigating emotional regulation, academic pressure, and family transitions.',
      about: 'Educated at University of Oxford. Dr. Jenkins partners with families to foster resilient, emotionally safe communication patterns.',
      image: 'https://images.unsplash.com/photo-1594824813589-3221bfd4f715?w=400&auto=format&fit=crop&q=80',
      photo: 'https://images.unsplash.com/photo-1594824813589-3221bfd4f715?w=400&auto=format&fit=crop&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1594824813589-3221bfd4f715?w=400&auto=format&fit=crop&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1594824813589-3221bfd4f715?w=400&auto=format&fit=crop&q=80',
      avatarInitials: 'SJ',
      status: 'ACTIVE',
      accountStatus: 'Active',
      verificationStatus: 'Verified',
      isCertified: true,
      licenseNumber: 'UK-HCPC-78192',
      languages: ['English', 'French'],
      education: 'PsyD in Child & Family Therapy, University of Oxford',
      qualifications: ['PsyD, Oxford University', 'Registered Family Counselor', 'HCPC Practitioner Psychologist'],
      specialties: ['Adolescent Anxiety', 'Family Systems', 'ADHD Behavioral Support', 'School Burnout'],
      activeClientsCount: 10,
      clientsServed: 160,
      totalSessions: 210,
      totalRevenue: 336000,
      therapyHours: 180,
      outcomes: { clientImprovementScore: 93, goalAchievementRate: 90, homeworkAdherenceRate: 87, attendanceRate: 97 },
      services: [
        { id: 'srv-3', serviceName: 'Adolescent & Family Guidance Session', durationMinutes: 50, sessionFee: 1600, platformFee: 1600, platform: 'Google Meet', description: 'Family system mediation, academic burnout counseling, and emotional regulation support.' }
      ],
      availability: {
        Monday: ['09:00', '10:00', '14:00', '15:00'],
        Wednesday: ['09:00', '10:00', '14:00', '15:00'],
        Thursday: ['10:00', '11:00', '15:00', '16:00'],
        Friday: ['09:00', '10:00', '11:00'],
        Saturday: ['10:00', '11:00'],
        Tuesday: [],
        Sunday: []
      }
    },
    {
      id: 'doc-4',
      identifier: 'aravind-swamy',
      name: 'Dr. Aravind Swamy',
      email: 'aravind.swamy@hexpertify.com',
      alternateEmail: 'dr.aravind@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'Psychiatry & Neuropsychiatry',
      professionId: 'prof-neuropsychiatry',
      title: 'Senior Consultant Neuropsychiatrist, MD',
      specialization: 'Adult ADHD, Chronic Depression, Sleep Medicine',
      experience: 15,
      yearsOfExperience: 15,
      experienceYears: 15,
      rating: 4.98,
      reviewCount: 57,
      hourlyRate: 2000,
      fee: 2000,
      fees: 2000,
      minPrice: 2000,
      platformFeePerSession: 2000,
      bio: 'Board-certified neuropsychiatrist combining precise diagnostic neuropsychiatry with evidence-based lifestyle neuroscience and sleep restoration.',
      about: 'Trained at NIMHANS and Harvard Medical School affiliate programs, Dr. Swamy provides integrative psychiatric evaluations.',
      image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
      photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
      avatarInitials: 'AS',
      status: 'ACTIVE',
      accountStatus: 'Active',
      verificationStatus: 'Verified',
      isCertified: true,
      licenseNumber: 'MCI-MD-34902',
      languages: ['English', 'Hindi', 'Tamil'],
      education: 'MD in Psychiatry, NIMHANS & Harvard Medical Affiliate',
      qualifications: ['MD in Psychiatry, NIMHANS', 'Fellow of Neuropsychiatry Association', 'Certified Sleep Medicine Specialist'],
      specialties: ['Adult ADHD', 'Chronic Depression', 'Sleep Medicine', 'Bipolar Spectrum Care'],
      activeClientsCount: 14,
      clientsServed: 240,
      totalSessions: 310,
      totalRevenue: 620000,
      therapyHours: 270,
      outcomes: { clientImprovementScore: 96, goalAchievementRate: 93, homeworkAdherenceRate: 90, attendanceRate: 99 },
      services: [
        { id: 'srv-4', serviceName: 'Comprehensive Neuropsychiatric Evaluation', durationMinutes: 50, sessionFee: 2000, platformFee: 2000, platform: 'Google Meet', description: 'In-depth diagnostic assessment for adult ADHD, chronic sleep disturbances, and neurobiological health.' }
      ],
      availability: {
        Tuesday: ['09:00', '10:00', '11:00', '16:00', '17:00'],
        Thursday: ['09:00', '10:00', '11:00', '16:00', '17:00'],
        Saturday: ['09:00', '10:00', '11:00', '12:00'],
        Monday: [],
        Wednesday: [],
        Friday: [],
        Sunday: []
      }
    },
    {
      id: 'doc-5',
      identifier: 'priya-sharma',
      name: 'Dr. Priya Sharma',
      email: 'priya.sharma@hexpertify.com',
      alternateEmail: 'dr.priya@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'Trauma Recovery & EMDR',
      professionId: 'prof-trauma-emdr',
      title: 'Trauma Specialist & Certified EMDR Practitioner',
      specialization: 'Complex PTSD, Attachment Trauma, Somatic Desensitization',
      experience: 10,
      yearsOfExperience: 10,
      experienceYears: 10,
      rating: 4.94,
      reviewCount: 39,
      hourlyRate: 1500,
      fee: 1500,
      fees: 1500,
      minPrice: 1500,
      platformFeePerSession: 1500,
      bio: 'Expert EMDR therapist guiding patients through gentle, trauma-informed processing of past emotional injuries toward grounded personal empowerment.',
      about: 'Certified by EMDRIA, Dr. Sharma uses bilateral somatic stimulation and nervous system tracking to resolve deep-seated traumatic stress.',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      avatarInitials: 'PS',
      status: 'ACTIVE',
      accountStatus: 'Active',
      verificationStatus: 'Verified',
      isCertified: true,
      licenseNumber: 'RCI-CR-2018-912',
      languages: ['English', 'Hindi'],
      education: 'MSc Clinical Psychology, EMDRIA Certified Practitioner',
      qualifications: ['MSc Clinical Psychology', 'EMDRIA Certified Therapist', 'Somatic Experiencing Practitioner'],
      specialties: ['Complex PTSD', 'Attachment Trauma', 'Somatic Desensitization', 'Childhood Wound Healing'],
      activeClientsCount: 9,
      clientsServed: 130,
      totalSessions: 175,
      totalRevenue: 262500,
      therapyHours: 150,
      outcomes: { clientImprovementScore: 91, goalAchievementRate: 88, homeworkAdherenceRate: 84, attendanceRate: 95 },
      services: [
        { id: 'srv-5', serviceName: 'Trauma Processing & EMDR Protocol', durationMinutes: 50, sessionFee: 1500, platformFee: 1500, platform: 'Google Meet', description: 'Bilateral stimulation and somatic trauma release protocol in a safe, compassionate clinical space.' }
      ],
      availability: {
        Monday: ['11:00', '12:00', '15:00', '16:00'],
        Tuesday: ['11:00', '12:00', '15:00', '16:00'],
        Wednesday: ['11:00', '12:00', '15:00', '16:00'],
        Friday: ['11:00', '12:00', '14:00', '15:00'],
        Thursday: [],
        Saturday: [],
        Sunday: []
      }
    },
    {
      id: 'doc-6',
      identifier: 'david-chen',
      name: 'Dr. David Chen',
      email: 'david.chen@hexpertify.com',
      alternateEmail: 'dr.david@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'Couples & Relationship Therapy',
      professionId: 'prof-couples-family',
      title: 'Licensed Marriage & Family Therapist (LMFT), PhD',
      specialization: 'Gottman Method, Emotionally Focused Therapy (EFT), Marital Conflict',
      experience: 14,
      yearsOfExperience: 14,
      experienceYears: 14,
      rating: 4.93,
      reviewCount: 44,
      hourlyRate: 1700,
      fee: 1700,
      fees: 1700,
      minPrice: 1700,
      platformFeePerSession: 1700,
      bio: 'Dr. David Chen specializes in couples dynamics, high-conflict resolution, communication de-escalation, and restoring emotional intimacy.',
      about: 'Doctorate from UC Berkeley. Certified Gottman Level 3 Therapist with 14 years supporting hundreds of couples globally.',
      image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
      photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
      avatarInitials: 'DC',
      status: 'ACTIVE',
      accountStatus: 'Active',
      verificationStatus: 'Verified',
      isCertified: true,
      licenseNumber: 'LMFT-CA-77123',
      languages: ['English', 'Mandarin'],
      education: 'PhD in Family Psychology, UC Berkeley',
      qualifications: ['PhD in Family Psychology, UC Berkeley', 'Licensed Marriage & Family Therapist (LMFT)', 'Certified Gottman Level 3'],
      specialties: ['Gottman Method', 'Emotionally Focused Therapy', 'Pre-Marital Counseling', 'Infidelity Recovery'],
      activeClientsCount: 11,
      clientsServed: 195,
      totalSessions: 260,
      totalRevenue: 442000,
      therapyHours: 230,
      outcomes: { clientImprovementScore: 93, goalAchievementRate: 90, homeworkAdherenceRate: 86, attendanceRate: 97 },
      services: [
        { id: 'srv-6', serviceName: 'Couples & Marriage Mediation Session', durationMinutes: 50, sessionFee: 1700, platformFee: 1700, platform: 'Google Meet', description: 'Evidence-based Gottman principles to resolve repetitive cycles and reconstruct deep mutual empathy.' }
      ],
      availability: {
        Monday: ['14:00', '15:00', '16:00', '17:00'],
        Wednesday: ['14:00', '15:00', '16:00', '17:00'],
        Thursday: ['10:00', '11:00', '14:00', '15:00'],
        Saturday: ['10:00', '11:00', '12:00', '13:00'],
        Tuesday: [],
        Friday: [],
        Sunday: []
      }
    },
    {
      id: 'doc-7',
      identifier: 'ananya-iyer',
      name: 'Dr. Ananya Iyer',
      email: 'ananya.iyer@hexpertify.com',
      alternateEmail: 'dr.ananya@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'Holistic & Integrative Psychotherapy',
      professionId: 'prof-integrative-holistic',
      title: 'Integrative Psychotherapist & MBCT Practitioner',
      specialization: 'Mindfulness-Based Cognitive Therapy, Somatic Experiencing, Compassion Fatigue',
      experience: 8,
      yearsOfExperience: 8,
      experienceYears: 8,
      rating: 4.91,
      reviewCount: 32,
      hourlyRate: 1300,
      fee: 1300,
      fees: 1300,
      minPrice: 1300,
      platformFeePerSession: 1300,
      bio: 'Blending Western psychological sciences with Eastern mindfulness traditions to address existential angst, chronic fatigue, and bodily tension.',
      about: 'Graduate of Tata Institute of Social Sciences (TISS). Dr. Iyer offers integrative therapy centered on somatic body awareness and self-compassion.',
      image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&auto=format&fit=crop&q=80',
      photo: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&auto=format&fit=crop&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&auto=format&fit=crop&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&auto=format&fit=crop&q=80',
      avatarInitials: 'AI',
      status: 'ACTIVE',
      accountStatus: 'Active',
      verificationStatus: 'Verified',
      isCertified: true,
      licenseNumber: 'RCI-CR-2020-564',
      languages: ['English', 'Hindi', 'Marathi'],
      education: 'M.Phil in Clinical Psychology, TISS Mumbai',
      qualifications: ['M.Phil Clinical Psychology, TISS', 'Certified Mindfulness Teacher (MBCT)', 'Somatic Movement Educator'],
      specialties: ['Mindfulness-Based Cognitive Therapy', 'Somatic Grounding', 'Compassion Fatigue', 'Vagus Nerve Regulation'],
      activeClientsCount: 8,
      clientsServed: 110,
      totalSessions: 150,
      totalRevenue: 195000,
      therapyHours: 130,
      outcomes: { clientImprovementScore: 90, goalAchievementRate: 87, homeworkAdherenceRate: 85, attendanceRate: 96 },
      services: [
        { id: 'srv-7', serviceName: 'Mindful Somatic Grounding Session', durationMinutes: 50, sessionFee: 1300, platformFee: 1300, platform: 'Google Meet', description: 'Re-harmonize nervous system arousal through breath biofeedback, mindfulness, and body awareness.' }
      ],
      availability: {
        Tuesday: ['10:00', '11:00', '14:00', '15:00'],
        Wednesday: ['10:00', '11:00', '14:00', '15:00'],
        Friday: ['10:00', '11:00', '15:00', '16:00'],
        Saturday: ['11:00', '12:00'],
        Monday: [],
        Thursday: [],
        Sunday: []
      }
    },
    {
      id: 'doc-8',
      identifier: 'liam-oconnor',
      name: 'Dr. Liam O\'Connor',
      email: 'liam.oconnor@hexpertify.com',
      alternateEmail: 'dr.liam@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'Addiction & Behavioral Health',
      professionId: 'prof-addiction-behavioral',
      title: 'Senior Addiction Counselor & Behavioral Specialist',
      specialization: 'Substance Dependency, Digital & Gambling Addictions, Relapse Prevention',
      experience: 13,
      yearsOfExperience: 13,
      experienceYears: 13,
      rating: 4.89,
      reviewCount: 38,
      hourlyRate: 1800,
      fee: 1800,
      fees: 1800,
      minPrice: 1800,
      platformFeePerSession: 1800,
      bio: 'Non-judgmental, pragmatic clinical support for individuals seeking sovereignty from alcohol, substances, screen compulsions, and harmful habits.',
      about: 'Educated at Trinity College Dublin. Dr. O\'Connor utilizes motivational interviewing and harm reduction to cultivate lasting sobriety.',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
      photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
      avatarInitials: 'LO',
      status: 'ACTIVE',
      accountStatus: 'Active',
      verificationStatus: 'Verified',
      isCertified: true,
      licenseNumber: 'IC&RC-ADC-44912',
      languages: ['English', 'Irish'],
      education: 'D.Clin.Psych, Trinity College Dublin',
      qualifications: ['D.Clin.Psych, Trinity College Dublin', 'Master Addictions Counselor (MAC)', 'Motivational Interviewing Network (MINT)'],
      specialties: ['Substance Dependency', 'Screen & Gaming Overuse', 'Relapse Prevention Planning', 'Co-Occurring Mood Disorders'],
      activeClientsCount: 9,
      clientsServed: 140,
      totalSessions: 180,
      totalRevenue: 324000,
      therapyHours: 155,
      outcomes: { clientImprovementScore: 88, goalAchievementRate: 86, homeworkAdherenceRate: 83, attendanceRate: 94 },
      services: [
        { id: 'srv-8', serviceName: 'Addiction Recovery & Relapse Prevention', durationMinutes: 50, sessionFee: 1800, platformFee: 1800, platform: 'Google Meet', description: 'Pragmatic harm reduction and cognitive strategies to regain autonomy from compulsive patterns.' }
      ],
      availability: {
        Monday: ['12:00', '13:00', '16:00', '17:00'],
        Tuesday: ['12:00', '13:00', '16:00', '17:00'],
        Thursday: ['12:00', '13:00', '16:00', '17:00'],
        Friday: ['13:00', '14:00', '15:00'],
        Wednesday: [],
        Saturday: [],
        Sunday: []
      }
    },
    {
      id: 'doc-9',
      identifier: 'maya-patel',
      name: 'Dr. Maya Patel',
      email: 'maya.patel@hexpertify.com',
      alternateEmail: 'dr.maya@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'Stress, Burnout & Peak Performance',
      professionId: 'prof-peak-performance',
      title: 'Executive Mental Health Coach & Psychologist, PsyD',
      specialization: 'High-Performance Burnout, Imposter Syndrome, Leadership Well-being',
      experience: 10,
      yearsOfExperience: 10,
      experienceYears: 10,
      rating: 4.97,
      reviewCount: 52,
      hourlyRate: 1600,
      fee: 1600,
      fees: 1600,
      minPrice: 1600,
      platformFeePerSession: 1600,
      bio: 'Trusted psychologist to startup founders, surgeons, and corporate executives navigating high-stakes pressure, perfectionism, and deep fatigue.',
      about: 'PsyD from Johns Hopkins University. Dr. Patel applies neuroscience-backed cognitive endurance tools and values clarification.',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      avatarInitials: 'MP',
      status: 'ACTIVE',
      accountStatus: 'Active',
      verificationStatus: 'Verified',
      isCertified: true,
      licenseNumber: 'PSY-MD-66231',
      languages: ['English', 'Gujarati', 'Hindi'],
      education: 'PsyD in Applied Psychology, Johns Hopkins University',
      qualifications: ['PsyD, Johns Hopkins University', 'Executive Coach Certification (ICF)', 'Certified Stress Management Specialist'],
      specialties: ['Executive Burnout', 'Imposter Syndrome', 'Perfectionism Paralysis', 'High-Stakes Decision Fatigue'],
      activeClientsCount: 13,
      clientsServed: 210,
      totalSessions: 270,
      totalRevenue: 432000,
      therapyHours: 235,
      outcomes: { clientImprovementScore: 95, goalAchievementRate: 92, homeworkAdherenceRate: 89, attendanceRate: 98 },
      services: [
        { id: 'srv-9', serviceName: 'Executive Burnout & Peak Resilience Protocol', durationMinutes: 50, sessionFee: 1600, platformFee: 1600, platform: 'Google Meet', description: 'Deconstruct hyper-vigilance, establish unshakeable work boundaries, and replenish cognitive stamina.' }
      ],
      availability: {
        Monday: ['08:00', '09:00', '17:00', '18:00'],
        Wednesday: ['08:00', '09:00', '17:00', '18:00'],
        Thursday: ['08:00', '09:00', '17:00', '18:00'],
        Saturday: ['09:00', '10:00', '11:00'],
        Tuesday: [],
        Friday: [],
        Sunday: []
      }
    },
    {
      id: 'doc-10',
      identifier: 'ethan-walker',
      name: 'Dr. Ethan Walker',
      email: 'ethan.walker@hexpertify.com',
      alternateEmail: 'dr.ethan@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'Grief, Loss & Life Transitions',
      professionId: 'prof-grief-geriatric',
      title: 'Bereavement Counselor & ACT Specialist, PhD',
      specialization: 'Complicated Grief, Major Life Transitions, Existential Therapy',
      experience: 16,
      yearsOfExperience: 16,
      experienceYears: 16,
      rating: 4.95,
      reviewCount: 46,
      hourlyRate: 1500,
      fee: 1500,
      fees: 1500,
      minPrice: 1500,
      platformFeePerSession: 1500,
      bio: 'Gentle, steady guidance through profound loss, sudden life disruptions, terminal diagnosis transitions, and existential soul-searching.',
      about: 'Doctorate in Counseling Psychology from Yale University with 16 years leading palliative and grief support clinics.',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      avatarInitials: 'EW',
      status: 'ACTIVE',
      accountStatus: 'Active',
      verificationStatus: 'Verified',
      isCertified: true,
      licenseNumber: 'PSY-CT-23091',
      languages: ['English'],
      education: 'PhD in Counseling Psychology, Yale University',
      qualifications: ['PhD, Yale University', 'Certified in Thanatology (CT)', 'Fellow in Thanatology: Death, Dying and Bereavement (FT)'],
      specialties: ['Bereavement & Loss', 'Complicated Grief', 'Life Stage Transitions', 'Existential Finding of Meaning'],
      activeClientsCount: 10,
      clientsServed: 185,
      totalSessions: 230,
      totalRevenue: 345000,
      therapyHours: 200,
      outcomes: { clientImprovementScore: 94, goalAchievementRate: 90, homeworkAdherenceRate: 86, attendanceRate: 97 },
      services: [
        { id: 'srv-10', serviceName: 'Grief & Meaning-Making Consultation', durationMinutes: 50, sessionFee: 1500, platformFee: 1500, platform: 'Google Meet', description: 'Holding sacred space for grief and reconstructing a sense of purpose and peace after significant loss.' }
      ],
      availability: {
        Tuesday: ['10:00', '11:00', '13:00', '14:00'],
        Wednesday: ['10:00', '11:00', '13:00', '14:00'],
        Thursday: ['10:00', '11:00', '13:00', '14:00'],
        Friday: ['10:00', '11:00', '12:00'],
        Monday: [],
        Saturday: [],
        Sunday: []
      }
    }
  ];

  const therapists = rawTherapists.map(t => {
    const sId = new ObjectId().toString();
    seoMetas.push({
      _id: sId,
      id: sId,
      metaTitle: `${t.name} | ${t.profession} Specialist`,
      metaDescription: t.bio,
      metaKeywords: [t.identifier, 'therapist', 'psychologist', 'hexpertify', t.professionId],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return {
      ...t,
      _id: t.id,
      seoMetaId: sId,
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date()
    };
  });

  // 4. CLIENT POOL GENERATOR (100 Diverse Clients)
  const clientNames = [
    'Ranjani B', 'Aarav Sharma', 'Ananya Deshmukh', 'Rohan Mehta', 'Kavita Krishnan',
    'Siddharth Verma', 'Sneha Reddy', 'Vikram Malhotra', 'Meera Nair', 'Aditya Joshi',
    'Pooja Gupta', 'Liam Davies', 'Sophia Martinez', 'Lucas Dubois', 'Emma Wilson',
    'Kabir Sen', 'Tanvi Bhatia', 'Rajeshwari Iyer', 'Devansh Chawla', 'Nandini Rao',
    'Arjun Patel', 'Ishaan Mukherjee', 'Diya Nambiar', 'Varun Kulkarni', 'Riya Agarwal',
    'Noah Thompson', 'Mia Andersen', 'Oliver Brown', 'Isabella Garcia', 'Ethan Miller',
    'Tara Pillai', 'Gaurav Banerjee', 'Shreya Kapoor', 'Nikhil Sinha', 'Ritika Saxena',
    'Karthik Venkat', 'Sunita Sundaram', 'Sameer Quadri', 'Pragya Hegde', 'Manish Tiwari',
    'Chloe Laurent', 'Alexander Novak', 'Elena Rossi', 'Lukas Weber', 'Freja Lindqvist',
    'Pranav Anand', 'Deepika Menon', 'Kunal Kashyap', 'Trisha Dasgupta', 'Harshwardhan Jha',
    'Anjali Goswami', 'Abhinav Rastogi', 'Sonia Sethi', 'Rishi Kaushik', 'Malini Bhattacharya',
    'Mateo Fernandez', 'Camila Santos', 'Gabriel Silva', 'Beatriz Lima', 'Arthur Dupont',
    'Vikas Singhania', 'Shruti Nayak', 'Akshay Mathur', 'Divya Balakrishnan', 'Chinmay Vora',
    'Rashmi Prabhu', 'Tushar Godbole', 'Swati Deshpande', 'Sanjay Pai', 'Pallavi Marathe',
    'Sebastian King', 'Amelia Harris', 'Benjamin Clark', 'Harper Lewis', 'Daniel Walker',
    'Aishwarya Raman', 'Girish Natarajan', 'Lavanya Shenoy', 'Suresh Namboodiri', 'Geeta Chandran',
    'Zainab Al-Mansoor', 'Farhan Siddiqui', 'Amina Begum', 'Tariq Mehmood', 'Rehana Qureshi',
    'Hiroshi Tanaka', 'Yuki Sato', 'Kenji Takahashi', 'Aoi Watanabe', 'Ren Kobayashi',
    'Kishore Vaidya', 'Shalini Mittal', 'Udayan Sen', 'Madhavi Rao', 'Bhaskar Sarma',
    'Charlotte Taylor', 'Henry Moore', 'Emily Jackson', 'Jack White', 'Hannah Martin'
  ];

  const clientAvatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=300&q=80'
  ];

  const primaryGoalsPool = [
    'Generalized Anxiety Reduction & Work Stress Regulation',
    'Panic Attack De-escalation & Somatic Nervous System Calming',
    'Executive Burnout, Imposter Syndrome & Career Boundaries',
    'Adult ADHD Focus Strategies, Time Blindness & Executive Functioning',
    'Depressive Episode Recovery & Daily Behavioral Activation',
    'Relationship Boundary Setting & Emotional Attachment Healing',
    'Sleep Hygiene Optimization & Chronic Insomnia Management',
    'Trauma Processing, Somatic Grounding & Emotional Regulation',
    'Mindfulness-Based Stress Inoculation & Self-Compassion',
    'Life Transition Adaptation, Grief & Existential Processing'
  ];

  const citiesPool = [
    'Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune',
    'New York', 'London', 'San Francisco', 'Toronto', 'Singapore', 'Sydney'
  ];

  const rawClients: any[] = [];
  const rawBookings: any[] = [];
  const rawReviews: any[] = [];

  for (let i = 0; i < 100; i++) {
    const num = i + 1;
    const clientId = `client-${num}`;
    const name = clientNames[i] || `Client User ${num}`;
    const isPrimaryClient = (i === 0);
    const email = isPrimaryClient ? 'ranjaniranjani5694@gmail.com' : `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com`;
    
    // Assign evenly to the 10 consultants
    const consultantIndex = i % 10;
    const therapist = therapists[consultantIndex];
    
    const age = 21 + ((i * 7) % 36);
    const gender = (i % 2 === 0) ? 'Female' : (i % 20 === 19 ? 'Non-Binary' : 'Male');
    const city = citiesPool[i % citiesPool.length];
    const preferredLanguage = (i % 5 === 0) ? 'Hindi' : ((i % 12 === 0) ? 'Tamil' : 'English');
    const avatarUrl = clientAvatars[i % clientAvatars.length];
    
    // Status distribution: ~85 Active, 10 Completed, 5 Inactive
    let status = 'Active';
    if (i % 10 === 9) status = 'Completed';
    else if (i % 20 === 18) status = 'Inactive';

    const goal = primaryGoalsPool[i % primaryGoalsPool.length];
    const riskLevel = (i % 15 === 0) ? 'Moderate' : 'Low';
    const joinedDate = new Date(Date.now() - (30 + (i * 2.5)) * 24 * 60 * 60 * 1000);
    const lastSessionDate = new Date(Date.now() - ((i % 10) + 1) * 24 * 60 * 60 * 1000);
    const nextSessionDate = new Date(Date.now() + (((i % 7) + 1) * 24 * 60 * 60 * 1000));

    const totalSessions = 3 + (i % 9);
    const completedSessions = Math.max(1, totalSessions - 1);

    const clientObj = {
      _id: clientId,
      id: clientId,
      name,
      email,
      password: hashedPassword,
      role: 'USER',
      roles: ['CLIENT', 'USER'],
      phone: `+91 98765 ${String(10000 + num).slice(1)}`,
      phoneNumber: `+91 98765 ${String(10000 + num).slice(1)}`,
      age: String(age),
      gender,
      city,
      preferredLanguage,
      avatarUrl,
      image: avatarUrl,
      assignedTherapistId: therapist.id,
      assignedTherapistName: therapist.name,
      assignedTherapistEmail: therapist.email,
      assignedTherapistPhoto: therapist.photo,
      service: therapist.services[0]?.serviceName || 'Individual Clinical Consultation',
      status,
      firstConsultationCompleted: true,
      emailVerified: new Date(),
      primaryGoal: goal,
      primaryConcern: goal,
      therapyGoals: [
        `Achieve sustainable regulation in ${goal.toLowerCase()}`,
        'Incorporate daily 10-minute mindfulness & somatic grounding exercises',
        'Reflect on emotional triggers using structured CBT thought logs'
      ],
      goals: [
        { id: `goal-${num}-1`, title: 'Daily Somatic Regulation Practice', targetDate: '2026-10-15', status: 'In Progress', progress: 75 },
        { id: `goal-${num}-2`, title: 'CBT Cognitive Restructuring Journaling', targetDate: '2026-11-01', status: 'In Progress', progress: 60 }
      ],
      aiIntakeSummary: `Client ${name} presented with goals targeting "${goal}". Reports moderate situational stress over past 3 months. Client exhibits high therapeutic motivation and receptive communication. Recommended course: bi-weekly evidence-based psychological consultation with ${therapist.name}.`,
      intakeResponses: {
        'Presenting Concern': goal,
        'Duration of Symptoms': '3 to 6 months',
        'Previous Therapy Experience': (i % 3 === 0) ? 'Yes, brief counseling previously' : 'First time seeking professional care',
        'Daily Sleep Quality': (i % 4 === 0) ? 'Disrupted, difficulty falling asleep' : 'Fair, 6-7 hours nightly',
        'Emergency Contact': `Family Member (${name.split(' ')[0]} Household) - +91 98111 22334`,
        'Preferred Session Time': 'Morning slots (10:00 AM - 12:00 PM)'
      },
      assessmentScores: [
        { name: 'GAD-7 (Anxiety)', score: 6 + (i % 9), maxScore: 21, date: lastSessionDate.toISOString().split('T')[0], severity: (i % 3 === 0) ? 'Moderate' : 'Mild' },
        { name: 'PHQ-9 (Depression)', score: 4 + (i % 8), maxScore: 27, date: lastSessionDate.toISOString().split('T')[0], severity: (i % 4 === 0) ? 'Mild' : 'Minimal' }
      ],
      moodScores: [
        { date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0], score: 5 },
        { date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0], score: 6 },
        { date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], score: 7 },
        { date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0], score: 8 }
      ],
      moodLogs: [
        { date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0], mood: 'Calm', score: 7, notes: 'Felt centered after the morning breathwork homework.' },
        { date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0], mood: 'Optimistic', score: 8, notes: 'Productive session discussing workplace boundaries with therapist.' }
      ],
      homeworkAssigned: [
        { title: 'Three-Column Thought Restructuring Log', dueDate: nextSessionDate.toISOString().split('T')[0], completed: false },
        { title: 'Morning 5-Minute Box Breathing Routine', dueDate: nextSessionDate.toISOString().split('T')[0], completed: true }
      ],
      homework: [
        { title: 'Three-Column Thought Restructuring Log', dueDate: nextSessionDate.toISOString().split('T')[0], status: 'Pending' },
        { title: 'Morning 5-Minute Box Breathing Routine', dueDate: nextSessionDate.toISOString().split('T')[0], status: 'Completed' }
      ],
      sessionHistory: [
        {
          id: `sess-${num}-1`,
          date: lastSessionDate.toISOString().split('T')[0],
          summary: `Clinical exploration of emotional triggers and cognitive restabilization with ${therapist.name}.`,
          therapistNotes: 'Patient was responsive and engaged. Practiced diaphragmatic grounding. Homework assigned.'
        }
      ],
      sessions: [
        {
          id: `sess-${num}-1`,
          date: lastSessionDate.toISOString().split('T')[0],
          service: therapist.services[0]?.serviceName,
          status: 'COMPLETED',
          notes: 'Regular clinical progression noted.'
        }
      ],
      documents: [
        { name: 'Initial Clinical Intake & Consent Form.pdf', size: '240 KB', date: joinedDate.toISOString().split('T')[0], type: 'PDF' },
        { name: 'CBT Thought Journal Template.pdf', size: '180 KB', date: lastSessionDate.toISOString().split('T')[0], type: 'PDF' }
      ],
      totalSessionsCount: totalSessions,
      completedSessionsCount: completedSessions,
      attendanceRate: 90 + (i % 10),
      activePlanName: 'Comprehensive Clinical Mental Healthcare',
      riskLevel,
      emergencyContactName: 'Emergency Support Relative',
      emergencyContactPhone: '+91 98111 22334',
      joinedDate: joinedDate.toISOString().split('T')[0],
      lastSession: lastSessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      lastSessionDate: lastSessionDate.toISOString().split('T')[0],
      nextSession: nextSessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', 10:00 AM',
      nextSessionDate: nextSessionDate.toISOString().split('T')[0],
      createdAt: joinedDate,
      updatedAt: new Date()
    };

    rawClients.push(clientObj);

    // Bookings for client:
    // 1. Past completed booking
    const pastBookingId = `BK-${num}-PAST`;
    rawBookings.push({
      _id: pastBookingId,
      id: pastBookingId,
      bookingId: `HEX-2026-${String(2000 + num)}`,
      clientId,
      userId: clientId,
      clientName: name,
      clientEmail: email,
      clientPhone: clientObj.phone,
      consultantId: therapist.id,
      therapistId: therapist.id,
      consultantName: therapist.name,
      therapistName: therapist.name,
      consultantEmail: therapist.email,
      serviceId: therapist.services[0]?.id || 'srv-1',
      serviceTitle: therapist.services[0]?.serviceName || 'Clinical Consultation',
      scheduledAt: lastSessionDate,
      date: lastSessionDate.toISOString().split('T')[0],
      time: '10:00 AM',
      durationMinutes: 50,
      duration: 50,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      amount: therapist.hourlyRate,
      meetingLink: `https://meet.google.com/hex-${therapist.id.replace('doc-', '')}-${num}`,
      notes: 'Completed clinical session.',
      createdAt: new Date(lastSessionDate.getTime() - 86400000 * 3),
      updatedAt: lastSessionDate
    });

    // 2. Upcoming scheduled booking for Active clients
    if (status === 'Active') {
      const upcomingBookingId = `BK-${num}-UPCOMING`;
      rawBookings.push({
        _id: upcomingBookingId,
        id: upcomingBookingId,
        bookingId: `HEX-2026-${String(3000 + num)}`,
        clientId,
        userId: clientId,
        clientName: name,
        clientEmail: email,
        clientPhone: clientObj.phone,
        consultantId: therapist.id,
        therapistId: therapist.id,
        consultantName: therapist.name,
        therapistName: therapist.name,
        consultantEmail: therapist.email,
        serviceId: therapist.services[0]?.id || 'srv-1',
        serviceTitle: therapist.services[0]?.serviceName || 'Clinical Consultation',
        scheduledAt: nextSessionDate,
        date: nextSessionDate.toISOString().split('T')[0],
        time: '10:00 AM',
        durationMinutes: 50,
        duration: 50,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        amount: therapist.hourlyRate,
        meetingLink: `https://meet.google.com/hex-${therapist.id.replace('doc-', '')}-${num}`,
        notes: 'Confirmed upcoming consultation session.',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Add a review from some clients (e.g. 1 out of every 3 clients)
    if (i % 3 === 0) {
      const reviewId = `rev-${num}`;
      rawReviews.push({
        _id: reviewId,
        id: reviewId,
        clientId,
        clientName: name,
        clientAvatar: avatarUrl,
        consultantId: therapist.id,
        consultantName: therapist.name,
        therapistId: therapist.id,
        therapistName: therapist.name,
        rating: 5,
        comment: `${therapist.name} was incredibly empathetic, patient, and knowledgeable. The strategies we practiced immediately helped decrease my stress levels. Highly recommend!`,
        verified: true,
        createdAt: lastSessionDate,
        updatedAt: lastSessionDate
      });
    }
  }

  // 5. SUPER ADMIN USER ACCOUNT (Preserved & Enhanced)
  const adminUser = {
    _id: 'admin-1',
    id: 'admin-1',
    name: 'Super Administrator',
    email: 'admin@hexpertify.com',
    password: adminHashedPassword,
    role: 'ADMIN',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    emailVerified: new Date(),
    status: 'ACTIVE',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date()
  };

  // Therapist accounts synced into User collection
  const therapistUsers = therapists.map(t => ({
    _id: t.id,
    id: t.id,
    name: t.name,
    email: t.email,
    alternateEmail: t.alternateEmail,
    password: hashedPassword,
    role: 'CONSULTANT',
    roles: ['CONSULTANT', 'THERAPIST'],
    profession: t.profession,
    title: t.title,
    image: t.image,
    photo: t.photo,
    photoUrl: t.photoUrl,
    avatarUrl: t.image,
    emailVerified: new Date(),
    status: 'ACTIVE',
    createdAt: t.createdAt,
    updatedAt: new Date()
  }));

  const allUsers = [adminUser, ...therapistUsers, ...rawClients];

  console.log(`📊 Prepared Data Summary:`);
  console.log(`   - Professions: ${professions.length}`);
  console.log(`   - Consultants: ${therapists.length}`);
  console.log(`   - Clients:     ${rawClients.length}`);
  console.log(`   - Total Users: ${allUsers.length} (1 Admin + 10 Consultants + 100 Clients)`);
  console.log(`   - Bookings:    ${rawBookings.length}`);
  console.log(`   - Reviews:     ${rawReviews.length}`);

  // 6. DB INSERTIONS (Dual collections: PascalCase & lowercase)
  console.log('🚀 Writing to MongoDB Atlas collections...');

  // A. Professions
  await db.collection<any>('Profession').deleteMany({});
  await db.collection<any>('professions').deleteMany({});
  await db.collection<any>('Profession').insertMany(professions);
  await db.collection<any>('professions').insertMany(professions);
  console.log(`✅ [Professions Synced] ${professions.length} clinical professions.`);

  // B. SEO Meta
  await db.collection<any>('SeoMeta').deleteMany({});
  await db.collection<any>('seo_metas').deleteMany({});
  await db.collection<any>('SeoMeta').insertMany(seoMetas);
  await db.collection<any>('seo_metas').insertMany(seoMetas);
  console.log(`✅ [SEO Metadata Synced] ${seoMetas.length} documents.`);

  // C. Consultants
  await db.collection<any>('Consultant').deleteMany({});
  await db.collection<any>('consultants').deleteMany({});
  await db.collection<any>('Consultant').insertMany(therapists);
  await db.collection<any>('consultants').insertMany(therapists);
  console.log(`✅ [Consultants Synced] ${therapists.length} consultants.`);

  // D. Users
  await db.collection<any>('User').deleteMany({});
  await db.collection<any>('users').deleteMany({});
  await db.collection<any>('User').insertMany(allUsers);
  await db.collection<any>('users').insertMany(allUsers);
  console.log(`✅ [Users Synced] ${allUsers.length} total users (100 clients + 10 consultants + 1 admin).`);

  // E. Bookings
  await db.collection<any>('Booking').deleteMany({});
  await db.collection<any>('bookings').deleteMany({});
  await db.collection<any>('Booking').insertMany(rawBookings);
  await db.collection<any>('bookings').insertMany(rawBookings);
  console.log(`✅ [Bookings Synced] ${rawBookings.length} bookings.`);

  // F. Reviews
  await db.collection<any>('Review').deleteMany({});
  await db.collection<any>('reviews').deleteMany({});
  await db.collection<any>('Review').insertMany(rawReviews);
  await db.collection<any>('reviews').insertMany(rawReviews);
  console.log(`✅ [Reviews Synced] ${rawReviews.length} client reviews.`);

  console.log('====================================================');
  console.log('   🎉 POPULATION COMPLETED SUCCESSFULLY!            ');
  console.log('====================================================');
  console.log('🔑 Credentials Reference:');
  console.log('   - Admin:      admin@hexpertify.com         | password: password123 (or admin123)');
  console.log('   - Client 1:   ranjaniranjani5694@gmail.com | password: password123');
  console.log('   - All other 99 Clients: <email>            | password: password123');
  console.log('   - All 10 Consultants:   <email>            | password: password123');
  console.log('====================================================');

  await closeDatabase();
}

seed().catch(err => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
