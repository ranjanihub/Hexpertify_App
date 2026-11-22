import { connectToDatabase, closeDatabase } from '../db/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

async function seed() {
  console.log('====================================================');
  console.log('   HEXPERTIFY: WIPING DB & SEEDING DUMMY DATA       ');
  console.log('====================================================');

  const db = await connectToDatabase();

  // 1. SAFETY BACKUP of current collections
  const backupDir = path.resolve(__dirname, '../../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const cols = await db.listCollections().toArray();
  const backupData: Record<string, any[]> = {};
  for (const c of cols) {
    backupData[c.name] = await db.collection<any>(c.name).find({}).toArray();
  }
  const backupFile = path.join(backupDir, `db_backup_before_wipe_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`📦 [Safety Backup Created] ${backupFile}`);

  // 2. WIPE / DROP EXISTING COLLECTIONS
  console.log('🗑️  [Wiping Existing Collections]...');
  for (const c of cols) {
    await db.collection<any>(c.name).deleteMany({});
    console.log(`   - Cleared collection: ${c.name}`);
  }

  const hashedPassword = await bcrypt.hash('password123', 10);
  const adminHashedPassword = await bcrypt.hash('admin123', 10);

  // SEO METAS CONTAINER
  const seoMetas: any[] = [];

  // 3. PROFESSIONS
  const rawProfessions = [
    {
      id: 'prof-clinical-psych',
      identifier: 'clinical-psychology',
      name: 'Clinical Psychology',
      slug: 'clinical-psychology',
      icon: 'Brain',
      description: 'Comprehensive assessment and evidence-based psychotherapy for mood disorders, anxiety, and depression.',
      therapistCount: 12
    },
    {
      id: 'prof-neuropsychiatry',
      identifier: 'psychiatry',
      name: 'Psychiatry & Neuropsychiatry',
      slug: 'psychiatry',
      icon: 'Activity',
      description: 'Medical mental healthcare, diagnostic evaluations, and biological psychiatry.',
      therapistCount: 8
    },
    {
      id: 'prof-cbt-mindfulness',
      identifier: 'cbt-mindfulness',
      name: 'CBT & Mindfulness Therapy',
      slug: 'cbt-mindfulness',
      icon: 'HeartPulse',
      description: 'Cognitive behavioral techniques, stress inoculation, and somatic mindfulness regulation.',
      therapistCount: 15
    },
    {
      id: 'prof-child-adolescent',
      identifier: 'child-adolescent',
      name: 'Child & Adolescent Counseling',
      slug: 'child-adolescent',
      icon: 'Smile',
      description: 'Specialized behavioral and developmental therapy for children, teens, and families.',
      therapistCount: 7
    },
    {
      id: 'prof-trauma-emdr',
      identifier: 'trauma-emdr',
      name: 'Trauma Recovery & EMDR',
      slug: 'trauma-emdr',
      icon: 'Shield',
      description: 'Trauma-informed care, PTSD recovery, and Eye Movement Desensitization and Reprocessing.',
      therapistCount: 9
    }
  ];

  const professions = rawProfessions.map(p => {
    const sId = new ObjectId().toString();
    seoMetas.push({
      _id: sId,
      id: sId,
      metaTitle: `${p.name} | Hexpertify Therapy`,
      metaDescription: p.description,
      metaKeywords: [p.slug, 'therapy', 'mental-health', 'hexpertify'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return {
      ...p,
      _id: p.id,
      seoMetaId: sId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  // 4. THERAPISTS / CONSULTANTS
  const rawTherapists = [
    {
      id: 'doc-1',
      identifier: 'evelyn-reed',
      name: 'Dr. Evelyn Reed',
      email: 'evelyn.reed@example.com',
      alternateEmail: 'dr.evelyn@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'Clinical Psychology',
      professionId: 'prof-clinical-psych',
      title: 'Licensed Clinical Psychologist, PhD',
      specialization: 'Mood Disorders, Panic Anxiety, CBT & Somatic Regulation',
      experience: 12,
      yearsOfExperience: 12,
      rating: 4.96,
      reviewCount: 48,
      hourlyRate: 1500,
      fee: 1500,
      bio: 'Dr. Evelyn Reed is a licensed clinical psychologist with over 12 years of clinical experience specializing in evidence-based CBT, somatic nervous system regulation, and mindfulness therapies.',
      about: 'Dr. Evelyn Reed is a licensed clinical psychologist with over 12 years of clinical experience specializing in evidence-based CBT, somatic nervous system regulation, and mindfulness therapies.',
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      avatarInitials: 'ER',
      status: 'ACTIVE',
      languages: ['English', 'Spanish'],
      education: 'PhD in Clinical Psychology, Stanford University',
      qualifications: ['PhD in Clinical Psychology, Stanford University', 'Licensed Clinical Psychologist (LCP)'],
      specialties: ['Mood Disorders', 'Panic Anxiety', 'CBT & Somatic Regulation'],
      availability: {
        Monday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        Tuesday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        Wednesday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        Thursday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        Friday: ['09:00', '10:00', '11:00', '14:00', '15:00'],
        Saturday: ['10:00', '11:00', '12:00'],
        Sunday: []
      },
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date()
    },
    {
      id: 'doc-2',
      identifier: 'marcus-vance',
      name: 'Dr. Marcus Vance',
      email: 'marcus.vance@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'CBT & Mindfulness Therapy',
      professionId: 'prof-cbt-mindfulness',
      title: 'Senior Clinical Psychologist (CBT & Somatic Care)',
      specialization: 'Cognitive Behavioral Therapy, General Anxiety, Work Burnout',
      experience: 9,
      yearsOfExperience: 9,
      rating: 4.92,
      reviewCount: 36,
      hourlyRate: 1400,
      fee: 1400,
      bio: 'Specializing in CBT and performance anxiety, Dr. Vance helps clients break negative thought cycles and develop sustainable emotional resilience.',
      about: 'Specializing in CBT and performance anxiety, Dr. Vance helps clients break negative thought cycles and develop sustainable emotional resilience.',
      image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
      avatarInitials: 'MV',
      status: 'ACTIVE',
      languages: ['English', 'German'],
      education: 'PsyD in Clinical Psychology, Columbia University',
      qualifications: ['PsyD in Clinical Psychology, Columbia University', 'Certified CBT Specialist'],
      specialties: ['Cognitive Behavioral Therapy', 'General Anxiety', 'Work Burnout'],
      availability: {
        Monday: ['10:00', '11:00', '13:00', '15:00', '16:00'],
        Tuesday: ['10:00', '11:00', '13:00', '15:00', '16:00'],
        Wednesday: ['10:00', '11:00', '14:00', '15:00'],
        Thursday: ['10:00', '11:00', '14:00', '15:00', '17:00'],
        Friday: ['10:00', '11:00', '12:00'],
        Saturday: ['11:00', '12:00'],
        Sunday: []
      },
      createdAt: new Date('2025-02-01'),
      updatedAt: new Date()
    },
    {
      id: 'doc-3',
      identifier: 'sarah-jenkins',
      name: 'Dr. Sarah Jenkins',
      email: 'sarah.jenkins@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'Child & Adolescent Counseling',
      professionId: 'prof-child-adolescent',
      title: 'Pediatric & Family Therapist, PsyD',
      specialization: 'Adolescent Anxiety, Family Systems, ADHD Behavioral Support',
      experience: 11,
      yearsOfExperience: 11,
      rating: 4.95,
      reviewCount: 41,
      hourlyRate: 1600,
      fee: 1600,
      bio: 'Compassionate care for adolescents and parents navigating emotional regulation, academic pressure, and developmental transitions.',
      about: 'Compassionate care for adolescents and parents navigating emotional regulation, academic pressure, and developmental transitions.',
      image: 'https://images.unsplash.com/photo-1594824813589-3221bfd4f715?w=300&auto=format&fit=crop&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1594824813589-3221bfd4f715?w=300&auto=format&fit=crop&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1594824813589-3221bfd4f715?w=300&auto=format&fit=crop&q=80',
      avatarInitials: 'SJ',
      status: 'ACTIVE',
      languages: ['English', 'French'],
      education: 'PsyD in Child & Family Therapy, University of Oxford',
      qualifications: ['PsyD in Child & Family Therapy, University of Oxford', 'Registered Family Counselor'],
      specialties: ['Adolescent Anxiety', 'Family Systems', 'ADHD Behavioral Support'],
      availability: {
        Monday: ['09:00', '10:00', '14:00', '15:00'],
        Wednesday: ['09:00', '10:00', '14:00', '15:00'],
        Thursday: ['10:00', '11:00', '15:00', '16:00'],
        Friday: ['09:00', '10:00', '11:00'],
        Saturday: ['10:00', '11:00'],
        Sunday: []
      },
      createdAt: new Date('2025-02-15'),
      updatedAt: new Date()
    },
    {
      id: 'doc-4',
      identifier: 'aravind-swamy',
      name: 'Dr. Aravind Swamy',
      email: 'aravind.swamy@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'Psychiatry & Neuropsychiatry',
      professionId: 'prof-neuropsychiatry',
      title: 'Senior Consultant Neuropsychiatrist, MD',
      specialization: 'Adult ADHD, Chronic Depression, Sleep Medicine',
      experience: 15,
      yearsOfExperience: 15,
      rating: 4.98,
      reviewCount: 57,
      hourlyRate: 2000,
      fee: 2000,
      bio: 'Board-certified neuropsychiatrist with 15+ years of clinical leadership combining diagnostic neuropsychiatry with holistic lifestyle neuroscience.',
      about: 'Board-certified neuropsychiatrist with 15+ years of clinical leadership combining diagnostic neuropsychiatry with holistic lifestyle neuroscience.',
      image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
      avatarInitials: 'AS',
      status: 'ACTIVE',
      languages: ['English', 'Hindi', 'Tamil'],
      education: 'MD in Psychiatry, NIMHANS & Harvard Medical Affiliate',
      qualifications: ['MD in Psychiatry, NIMHANS', 'Fellow of Neuropsychiatry Association'],
      specialties: ['Adult ADHD', 'Chronic Depression', 'Sleep Medicine'],
      availability: {
        Tuesday: ['09:00', '10:00', '11:00', '16:00', '17:00'],
        Thursday: ['09:00', '10:00', '11:00', '16:00', '17:00'],
        Saturday: ['09:00', '10:00', '11:00', '12:00'],
        Monday: [],
        Wednesday: [],
        Friday: [],
        Sunday: []
      },
      createdAt: new Date('2025-01-05'),
      updatedAt: new Date()
    },
    {
      id: 'doc-5',
      identifier: 'priya-sharma',
      name: 'Dr. Priya Sharma',
      email: 'priya.sharma@hexpertify.com',
      role: 'CONSULTANT',
      profession: 'Trauma Recovery & EMDR',
      professionId: 'prof-trauma-emdr',
      title: 'Trauma Specialist & Certified EMDR Practitioner',
      specialization: 'Complex PTSD, Attachment Trauma, Emotional Freedom Technique',
      experience: 10,
      yearsOfExperience: 10,
      rating: 4.94,
      reviewCount: 39,
      hourlyRate: 1500,
      fee: 1500,
      bio: 'Expert EMDR therapist guiding patients through gentle, trauma-informed processing of past emotional injuries toward grounded empowerment.',
      about: 'Expert EMDR therapist guiding patients through gentle, trauma-informed processing of past emotional injuries toward grounded empowerment.',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      avatarInitials: 'PS',
      status: 'ACTIVE',
      languages: ['English', 'Hindi'],
      education: 'MSc Clinical Psychology, EMDRIA Certified Practitioner',
      qualifications: ['MSc Clinical Psychology', 'EMDRIA Certified Therapist'],
      specialties: ['Complex PTSD', 'Attachment Trauma', 'Emotional Freedom Technique'],
      availability: {
        Monday: ['11:00', '12:00', '15:00', '16:00'],
        Tuesday: ['11:00', '12:00', '15:00', '16:00'],
        Wednesday: ['11:00', '12:00', '15:00', '16:00'],
        Friday: ['11:00', '12:00', '14:00', '15:00'],
        Thursday: [],
        Saturday: [],
        Sunday: []
      },
      createdAt: new Date('2025-02-20'),
      updatedAt: new Date()
    }
  ];

  const therapists = rawTherapists.map(t => {
    const sId = new ObjectId().toString();
    seoMetas.push({
      _id: sId,
      id: sId,
      metaTitle: `${t.name} | Hexpertify Therapy`,
      metaDescription: t.bio,
      metaKeywords: [t.identifier, 'therapist', 'psychologist', 'hexpertify'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return {
      ...t,
      _id: t.id,
      seoMetaId: sId,
      isCertified: true,
      clientCount: t.reviewCount || 10,
      minPrice: t.hourlyRate,
      certificateUrls: [],
      certificateAltTexts: [],
      faqs: []
    };
  });

  // PAGES & CMS
  const rawPages = [
    { id: 'page-home', identifier: 'home', notificationTitle: 'Welcome to Hexpertify' },
    { id: 'page-about', identifier: 'about', notificationTitle: 'About Hexpertify Clinical Care' },
    { id: 'page-consultants', identifier: 'consultants', notificationTitle: 'Find Licensed Therapists' },
    { id: 'page-services', identifier: 'services', notificationTitle: 'Evidence-Based Therapy Services' },
    { id: 'page-contact', identifier: 'contact', notificationTitle: 'Contact Our Care Team' }
  ];

  const pages = rawPages.map(p => {
    const sId = new ObjectId().toString();
    seoMetas.push({
      _id: sId,
      id: sId,
      metaTitle: `${p.notificationTitle} | Hexpertify`,
      metaDescription: `${p.notificationTitle} - Professional mental health consultations.`,
      metaKeywords: ['therapy', 'hexpertify', p.identifier],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return {
      ...p,
      _id: p.id,
      carouselImageUrls: [],
      carouselImageAltTexts: [],
      carouselImageIsMobileFlags: [],
      faqs: [],
      testimonials: [],
      seoMetaId: sId
    };
  });

  // INSERT SEOMETA
  await db.collection<any>('SeoMeta').insertMany(seoMetas);
  await db.collection<any>('seo_metas').insertMany(seoMetas);
  console.log(`✅ [SeoMeta Inserted] ${seoMetas.length} SEO metadata documents`);

  // INSERT PROFESSIONS
  await db.collection<any>('Profession').insertMany(professions);
  await db.collection<any>('professions').insertMany(professions);
  console.log(`✅ [Professions Inserted] ${professions.length} clinical professions`);

  // INSERT CONSULTANTS / THERAPISTS
  await db.collection<any>('Consultant').insertMany(therapists);
  await db.collection<any>('consultants').insertMany(therapists);
  console.log(`✅ [Consultants Inserted] ${therapists.length} licensed therapists`);

  // INSERT PAGES
  await db.collection<any>('Page').insertMany(pages);
  await db.collection<any>('pages').insertMany(pages);
  console.log(`✅ [Pages Inserted] ${pages.length} pages`);

  // 5. SERVICES
  const services = [
    {
      id: 'srv-1',
      _id: 'srv-1',
      name: 'Individual Psychotherapy & CBT Session',
      title: 'Individual Psychotherapy & CBT Session',
      duration: 60,
      durationMinutes: 60,
      sessionCount: 1,
      price: 1500,
      amount: 1500,
      platform: 'G-Meet',
      description: 'One-on-one virtual psychological consultation focusing on evidence-based cognitive restructuring and stress management.',
      consultantId: 'doc-1',
      consultantName: 'Dr. Evelyn Reed',
      professionId: 'prof-clinical-psych',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'srv-2',
      _id: 'srv-2',
      name: 'Anxiety & Panic Disorder Consultation',
      title: 'Anxiety & Panic Disorder Consultation',
      duration: 50,
      durationMinutes: 50,
      sessionCount: 1,
      price: 1400,
      amount: 1400,
      platform: 'G-Meet',
      description: 'Targeted behavioral intervention to deactivate acute panic loops, somatic hyperarousal, and social anxiety.',
      consultantId: 'doc-2',
      consultantName: 'Dr. Marcus Vance',
      professionId: 'prof-cbt-mindfulness',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'srv-3',
      _id: 'srv-3',
      name: 'Adolescent & Family Guidance Session',
      title: 'Adolescent & Family Guidance Session',
      duration: 60,
      durationMinutes: 60,
      sessionCount: 1,
      price: 1600,
      amount: 1600,
      platform: 'G-Meet',
      description: 'Family system mediation, academic burnout counseling, and emotional regulation support for teens.',
      consultantId: 'doc-3',
      consultantName: 'Dr. Sarah Jenkins',
      professionId: 'prof-child-adolescent',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'srv-4',
      _id: 'srv-4',
      name: 'Comprehensive Neuropsychiatric Evaluation',
      title: 'Comprehensive Neuropsychiatric Evaluation',
      duration: 75,
      durationMinutes: 75,
      sessionCount: 1,
      price: 2000,
      amount: 2000,
      platform: 'G-Meet',
      description: 'In-depth diagnostic assessment for adult ADHD, chronic sleep disturbances, and neurobiological health.',
      consultantId: 'doc-4',
      consultantName: 'Dr. Aravind Swamy',
      professionId: 'prof-neuropsychiatry',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'srv-5',
      _id: 'srv-5',
      name: 'Trauma Processing & EMDR Protocol',
      title: 'Trauma Processing & EMDR Protocol',
      duration: 60,
      durationMinutes: 60,
      sessionCount: 1,
      price: 1500,
      amount: 1500,
      platform: 'G-Meet',
      description: 'Bilateral stimulation and somatic trauma release protocol in a safe, compassionate clinical environment.',
      consultantId: 'doc-5',
      consultantName: 'Dr. Priya Sharma',
      professionId: 'prof-trauma-emdr',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'srv-6',
      _id: 'srv-6',
      name: 'Mental Wellness & Stress Check-in',
      title: 'Mental Wellness & Stress Check-in',
      duration: 30,
      durationMinutes: 30,
      sessionCount: 1,
      price: 800,
      amount: 800,
      platform: 'G-Meet',
      description: 'Quick check-in session for established clients to calibrate therapy progress and homework exercises.',
      consultantId: 'doc-1',
      consultantName: 'Dr. Evelyn Reed',
      professionId: 'prof-clinical-psych',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  await db.collection<any>('Service').insertMany(services);
  await db.collection<any>('services').insertMany(services);
  console.log(`✅ [Services Inserted] ${services.length} clinical services`);

  // 6. USERS (Super Admin, Therapists & Clients)
  const rawUsers = [
    // Super Administrator
    {
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
    },
    // Mirror Therapists in User Collection for SSO
    ...therapists.map(t => ({
      id: t.id,
      name: t.name,
      email: t.email,
      password: hashedPassword,
      role: 'ADMIN', // Allow therapist access or role 'CONSULTANT'
      roles: ['CONSULTANT', 'THERAPIST'],
      profession: t.profession,
      title: t.title,
      image: t.image,
      avatarUrl: t.image,
      emailVerified: new Date(),
      status: 'ACTIVE',
      createdAt: t.createdAt,
      updatedAt: new Date()
    })),
    // Primary Client: Ranjani B
    {
      id: 'client-1',
      name: 'Ranjani B',
      email: 'ranjaniranjani5694@gmail.com',
      password: hashedPassword,
      role: 'USER',
      roles: ['CLIENT', 'USER'],
      phone: '+91 98765 43210',
      phoneNumber: '+91 98765 43210',
      age: '28',
      gender: 'Female',
      preferredLanguage: 'English',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      assignedTherapistId: 'doc-1',
      assignedTherapistName: 'Dr. Evelyn Reed',
      assignedTherapistEmail: 'evelyn.reed@example.com',
      assignedTherapistPhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      primaryGoal: 'Generalized Anxiety Reduction & Work Stress Regulation',
      firstConsultationCompleted: true,
      emailVerified: new Date(),
      status: 'ACTIVE',
      createdAt: new Date('2025-02-01'),
      updatedAt: new Date()
    },
    // Secondary Client: Sarah Jenkins (Client persona)
    {
      id: 'client-2',
      name: 'Sarah Jenkins',
      email: 'sarah@hexpertify.com',
      alternateEmail: 'sarah.client@example.com',
      password: hashedPassword,
      role: 'USER',
      roles: ['CLIENT', 'USER'],
      phone: '+1 (555) 321-7654',
      phoneNumber: '+1 (555) 321-7654',
      age: '32',
      gender: 'Female',
      preferredLanguage: 'English',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
      assignedTherapistId: 'doc-1',
      assignedTherapistName: 'Dr. Evelyn Reed',
      assignedTherapistEmail: 'evelyn.reed@example.com',
      assignedTherapistPhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      primaryGoal: 'Post-Traumatic Stress & Panic Recovery',
      firstConsultationCompleted: true,
      emailVerified: new Date(),
      status: 'ACTIVE',
      createdAt: new Date('2025-02-05'),
      updatedAt: new Date()
    },
    // Client 3: Johnathan Doe
    {
      id: 'client-3',
      name: 'Johnathan Doe',
      email: 'john.doe@example.com',
      password: hashedPassword,
      role: 'USER',
      roles: ['CLIENT', 'USER'],
      phone: '+1 (555) 987-6543',
      phoneNumber: '+1 (555) 987-6543',
      age: '35',
      gender: 'Male',
      preferredLanguage: 'English',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      assignedTherapistId: 'doc-2',
      assignedTherapistName: 'Dr. Marcus Vance',
      assignedTherapistEmail: 'marcus.vance@hexpertify.com',
      assignedTherapistPhoto: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
      primaryGoal: 'Executive Burnout & Sleep Regularization',
      firstConsultationCompleted: true,
      emailVerified: new Date(),
      status: 'ACTIVE',
      createdAt: new Date('2025-02-10'),
      updatedAt: new Date()
    },
    // Client 4: Alex Morgan
    {
      id: 'client-4',
      name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      password: hashedPassword,
      role: 'USER',
      roles: ['CLIENT', 'USER'],
      phone: '+1 (555) 456-7890',
      phoneNumber: '+1 (555) 456-7890',
      age: '26',
      gender: 'Non-Binary',
      preferredLanguage: 'English',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      assignedTherapistId: 'doc-3',
      assignedTherapistName: 'Dr. Sarah Jenkins',
      assignedTherapistEmail: 'sarah.jenkins@hexpertify.com',
      assignedTherapistPhoto: 'https://images.unsplash.com/photo-1594824813589-3221bfd4f715?w=300&auto=format&fit=crop&q=80',
      primaryGoal: 'Social Anxiety & Career Transition Support',
      firstConsultationCompleted: true,
      emailVerified: new Date(),
      status: 'ACTIVE',
      createdAt: new Date('2025-02-14'),
      updatedAt: new Date()
    },
    // Client 5: Emily Clark
    {
      id: 'client-5',
      name: 'Emily Clark',
      email: 'emily.clark@example.com',
      password: hashedPassword,
      role: 'USER',
      roles: ['CLIENT', 'USER'],
      phone: '+1 (555) 678-9012',
      phoneNumber: '+1 (555) 678-9012',
      age: '24',
      gender: 'Female',
      preferredLanguage: 'English',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      assignedTherapistId: 'doc-5',
      assignedTherapistName: 'Dr. Priya Sharma',
      assignedTherapistEmail: 'priya.sharma@hexpertify.com',
      assignedTherapistPhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      primaryGoal: 'Relationship Boundaries & Emotional Healing',
      firstConsultationCompleted: true,
      emailVerified: new Date(),
      status: 'ACTIVE',
      createdAt: new Date('2025-02-20'),
      updatedAt: new Date()
    }
  ];

  const users = rawUsers.map(u => ({
    ...u,
    _id: u.id
  }));

  await db.collection<any>('User').insertMany(users);
  await db.collection<any>('users').insertMany(users);
  console.log(`✅ [Users Inserted] ${users.length} accounts (Super Admin, Practitioners & Clients)`);

  // 7. BOOKINGS & SESSIONS
  const rawBookings = [
    // Upcoming for Ranjani with Dr. Evelyn Reed
    {
      id: 'bk-101',
      bookingId: 'HEX-2026-101',
      userId: 'client-1',
      clientId: 'client-1',
      clientName: 'Ranjani B',
      clientEmail: 'ranjaniranjani5694@gmail.com',
      clientPhone: '+91 98765 43210',
      consultantId: 'doc-1',
      therapistId: 'doc-1',
      consultantName: 'Dr. Evelyn Reed',
      therapistName: 'Dr. Evelyn Reed',
      consultantEmail: 'evelyn.reed@example.com',
      serviceId: 'srv-1',
      serviceTitle: 'Individual Psychotherapy & CBT Session',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '10:00 AM',
      durationMinutes: 60,
      amount: 1500,
      fee: 1500,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      meetingLink: 'https://meet.google.com/hex-care-session-101',
      notes: 'Weekly follow-up on breathing biofeedback and thought reframing.',
      createdAt: new Date('2026-03-01'),
      updatedAt: new Date()
    },
    // Past completed for Ranjani with Dr. Evelyn Reed
    {
      id: 'bk-102',
      bookingId: 'HEX-2026-102',
      userId: 'client-1',
      clientId: 'client-1',
      clientName: 'Ranjani B',
      clientEmail: 'ranjaniranjani5694@gmail.com',
      clientPhone: '+91 98765 43210',
      consultantId: 'doc-1',
      therapistId: 'doc-1',
      consultantName: 'Dr. Evelyn Reed',
      therapistName: 'Dr. Evelyn Reed',
      consultantEmail: 'evelyn.reed@example.com',
      serviceId: 'srv-1',
      serviceTitle: 'Individual Psychotherapy & CBT Session',
      scheduledAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '11:00 AM',
      durationMinutes: 60,
      amount: 1500,
      fee: 1500,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      meetingLink: 'https://meet.google.com/hex-care-session-102',
      notes: 'Reviewed initial GAD-7 assessment. Introduced the 4-7-8 parasympathetic exercise.',
      clinicalOutcomeNotes: 'Client responded exceptionally well to mindfulness grounding. Anxiety reduced from 14 to 9.',
      createdAt: new Date('2026-02-25'),
      updatedAt: new Date()
    },
    // Past completed session 2
    {
      id: 'bk-103',
      bookingId: 'HEX-2026-103',
      userId: 'client-1',
      clientId: 'client-1',
      clientName: 'Ranjani B',
      clientEmail: 'ranjaniranjani5694@gmail.com',
      clientPhone: '+91 98765 43210',
      consultantId: 'doc-1',
      therapistId: 'doc-1',
      consultantName: 'Dr. Evelyn Reed',
      therapistName: 'Dr. Evelyn Reed',
      consultantEmail: 'evelyn.reed@example.com',
      serviceId: 'srv-6',
      serviceTitle: 'Mental Wellness & Stress Check-in',
      scheduledAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '02:00 PM',
      durationMinutes: 30,
      amount: 800,
      fee: 800,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      meetingLink: 'https://meet.google.com/hex-care-session-103',
      notes: 'Initial clinical intake and baseline PHQ-9 scoring.',
      createdAt: new Date('2026-02-18'),
      updatedAt: new Date()
    },
    // Sarah Jenkins Client Session with Dr. Evelyn Reed
    {
      id: 'bk-104',
      bookingId: 'HEX-2026-104',
      userId: 'client-2',
      clientId: 'client-2',
      clientName: 'Sarah Jenkins',
      clientEmail: 'sarah@hexpertify.com',
      consultantId: 'doc-1',
      therapistId: 'doc-1',
      consultantName: 'Dr. Evelyn Reed',
      therapistName: 'Dr. Evelyn Reed',
      consultantEmail: 'evelyn.reed@example.com',
      serviceId: 'srv-1',
      serviceTitle: 'Individual Psychotherapy & CBT Session',
      scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '03:00 PM',
      durationMinutes: 60,
      amount: 1500,
      fee: 1500,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      meetingLink: 'https://meet.google.com/hex-care-session-104',
      notes: 'Cognitive reframing for workplace boundaries.',
      createdAt: new Date('2026-03-02'),
      updatedAt: new Date()
    },
    // Johnathan Doe with Dr. Marcus Vance
    {
      id: 'bk-105',
      bookingId: 'HEX-2026-105',
      userId: 'client-3',
      clientId: 'client-3',
      clientName: 'Johnathan Doe',
      clientEmail: 'john.doe@example.com',
      consultantId: 'doc-2',
      therapistId: 'doc-2',
      consultantName: 'Dr. Marcus Vance',
      therapistName: 'Dr. Marcus Vance',
      consultantEmail: 'marcus.vance@hexpertify.com',
      serviceId: 'srv-2',
      serviceTitle: 'Anxiety & Panic Disorder Consultation',
      scheduledAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      date: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '10:00 AM',
      durationMinutes: 50,
      amount: 1400,
      fee: 1400,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      meetingLink: 'https://meet.google.com/hex-care-session-105',
      notes: 'Work-life balance restoration plan.',
      createdAt: new Date('2026-03-03'),
      updatedAt: new Date()
    },
    // Alex Morgan with Dr. Sarah Jenkins
    {
      id: 'bk-106',
      bookingId: 'HEX-2026-106',
      userId: 'client-4',
      clientId: 'client-4',
      clientName: 'Alex Morgan',
      clientEmail: 'alex.morgan@example.com',
      consultantId: 'doc-3',
      therapistId: 'doc-3',
      consultantName: 'Dr. Sarah Jenkins',
      therapistName: 'Dr. Sarah Jenkins',
      consultantEmail: 'sarah.jenkins@hexpertify.com',
      serviceId: 'srv-3',
      serviceTitle: 'Adolescent & Family Guidance Session',
      scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '02:00 PM',
      durationMinutes: 60,
      amount: 1600,
      fee: 1600,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      meetingLink: 'https://meet.google.com/hex-care-session-106',
      notes: 'Family mediation and communication protocols.',
      createdAt: new Date('2026-02-28'),
      updatedAt: new Date()
    },
    // Emily Clark with Dr. Priya Sharma
    {
      id: 'bk-107',
      bookingId: 'HEX-2026-107',
      userId: 'client-5',
      clientId: 'client-5',
      clientName: 'Emily Clark',
      clientEmail: 'emily.clark@example.com',
      consultantId: 'doc-5',
      therapistId: 'doc-5',
      consultantName: 'Dr. Priya Sharma',
      therapistName: 'Dr. Priya Sharma',
      consultantEmail: 'priya.sharma@hexpertify.com',
      serviceId: 'srv-5',
      serviceTitle: 'Trauma Processing & EMDR Protocol',
      scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '11:00 AM',
      durationMinutes: 60,
      amount: 1500,
      fee: 1500,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      meetingLink: 'https://meet.google.com/hex-care-session-107',
      notes: 'EMDR resource installation phase.',
      createdAt: new Date('2026-02-26'),
      updatedAt: new Date()
    },
    // Historical Bookings for Super Admin Revenue Curves
    ...Array.from({ length: 15 }).map((_, i) => {
      const dayOffset = (i + 1) * 3;
      const th = therapists[i % therapists.length];
      const cl = users.slice(6)[i % (users.length - 6)] || users[6];
      const amt = th.hourlyRate || 1500;
      return {
        id: `bk-hist-${i + 1}`,
        bookingId: `HEX-2026-H${i + 1}`,
        userId: cl.id,
        clientId: cl.id,
        clientName: cl.name,
        clientEmail: cl.email,
        consultantId: th.id,
        therapistId: th.id,
        consultantName: th.name,
        therapistName: th.name,
        consultantEmail: th.email,
        serviceId: 'srv-1',
        serviceTitle: 'Individual Psychotherapy & CBT Session',
        scheduledAt: new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000),
        date: new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '11:00 AM',
        durationMinutes: 60,
        amount: amt,
        fee: amt,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        meetingLink: `https://meet.google.com/hex-hist-${i + 1}`,
        createdAt: new Date(Date.now() - (dayOffset + 2) * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      };
    })
  ];

  const bookings = rawBookings.map(b => ({
    ...b,
    _id: b.id
  }));

  await db.collection<any>('Booking').insertMany(bookings);
  await db.collection<any>('bookings').insertMany(bookings);
  console.log(`✅ [Bookings Inserted] ${bookings.length} upcoming & completed clinical sessions`);

  // 8. REVIEWS & RATINGS
  const rawReviews = [
    {
      id: 'rev-1',
      consultantId: 'doc-1',
      therapistId: 'doc-1',
      authorId: 'client-1',
      consultantName: 'Dr. Evelyn Reed',
      therapistName: 'Dr. Evelyn Reed',
      clientName: 'Ranjani B',
      rating: 5,
      comment: 'Dr. Evelyn is deeply compassionate and insightful. Her CBT guidance has transformed how I handle anxiety and panic episodes.',
      serviceTitle: 'Individual Psychotherapy & CBT Session',
      imageUrls: [],
      imageAltTexts: [],
      createdAt: new Date('2026-02-27'),
      updatedAt: new Date()
    },
    {
      id: 'rev-2',
      consultantId: 'doc-1',
      therapistId: 'doc-1',
      authorId: 'client-2',
      consultantName: 'Dr. Evelyn Reed',
      therapistName: 'Dr. Evelyn Reed',
      clientName: 'Sarah Jenkins',
      rating: 5,
      comment: 'Exceptional clinical experience. Felt completely safe, validated, and equipped with practical daily tools from day one.',
      serviceTitle: 'Individual Psychotherapy & CBT Session',
      imageUrls: [],
      imageAltTexts: [],
      createdAt: new Date('2026-02-22'),
      updatedAt: new Date()
    },
    {
      id: 'rev-3',
      consultantId: 'doc-2',
      therapistId: 'doc-2',
      authorId: 'client-3',
      consultantName: 'Dr. Marcus Vance',
      therapistName: 'Dr. Marcus Vance',
      clientName: 'Johnathan Doe',
      rating: 5,
      comment: 'Dr. Vance helped me identify key cognitive distortions that were feeding chronic work stress. Highly recommended.',
      serviceTitle: 'Anxiety & Panic Disorder Consultation',
      imageUrls: [],
      imageAltTexts: [],
      createdAt: new Date('2026-02-20'),
      updatedAt: new Date()
    },
    {
      id: 'rev-4',
      consultantId: 'doc-3',
      therapistId: 'doc-3',
      authorId: 'client-4',
      consultantName: 'Dr. Sarah Jenkins',
      therapistName: 'Dr. Sarah Jenkins',
      clientName: 'Alex Morgan',
      rating: 5,
      comment: 'Our family dynamics have noticeably improved. Dr. Sarah has a rare gift for reaching teens and establishing healthy communication.',
      serviceTitle: 'Adolescent & Family Guidance Session',
      imageUrls: [],
      imageAltTexts: [],
      createdAt: new Date('2026-02-18'),
      updatedAt: new Date()
    },
    {
      id: 'rev-5',
      consultantId: 'doc-5',
      therapistId: 'doc-5',
      authorId: 'client-5',
      consultantName: 'Dr. Priya Sharma',
      therapistName: 'Dr. Priya Sharma',
      clientName: 'Emily Clark',
      rating: 5,
      comment: 'EMDR with Dr. Priya was gentle yet profoundly transformative. I finally feel free from past emotional triggers.',
      serviceTitle: 'Trauma Processing & EMDR Protocol',
      imageUrls: [],
      imageAltTexts: [],
      createdAt: new Date('2026-02-15'),
      updatedAt: new Date()
    }
  ];

  const reviews = rawReviews.map(r => ({
    ...r,
    _id: r.id
  }));

  await db.collection<any>('Review').insertMany(reviews);
  await db.collection<any>('reviews').insertMany(reviews);
  console.log(`✅ [Reviews Inserted] ${reviews.length} authentic patient reviews`);

  // 9. CLINICAL ASSESSMENTS & OUTCOME SCORES (PHQ-9 & GAD-7)
  const rawAssessments = [
    // Baseline Intake for Ranjani
    {
      id: 'score-1',
      userId: 'client-1',
      clientId: 'client-1',
      clientEmail: 'ranjaniranjani5694@gmail.com',
      therapistId: 'doc-1',
      type: 'GAD-7',
      title: 'Generalized Anxiety Disorder-7',
      score: 16,
      maxScore: 21,
      severity: 'Severe Anxiety',
      interpretation: 'Baseline assessment at clinical intake',
      date: '2026-02-15',
      createdAt: new Date('2026-02-15')
    },
    // Follow up session 1
    {
      id: 'score-2',
      userId: 'client-1',
      clientId: 'client-1',
      clientEmail: 'ranjaniranjani5694@gmail.com',
      therapistId: 'doc-1',
      type: 'GAD-7',
      title: 'Generalized Anxiety Disorder-7',
      score: 11,
      maxScore: 21,
      severity: 'Moderate Anxiety',
      interpretation: '31% reduction following biofeedback breathing',
      date: '2026-02-25',
      createdAt: new Date('2026-02-25')
    },
    // Follow up session 2 (Current Progress)
    {
      id: 'score-3',
      userId: 'client-1',
      clientId: 'client-1',
      clientEmail: 'ranjaniranjani5694@gmail.com',
      therapistId: 'doc-1',
      type: 'GAD-7',
      title: 'Generalized Anxiety Disorder-7',
      score: 6,
      maxScore: 21,
      severity: 'Mild / Sub-Clinical',
      interpretation: '62% improvement from clinical baseline',
      date: '2026-03-04',
      createdAt: new Date('2026-03-04')
    },
    // PHQ-9 Depression Baseline
    {
      id: 'score-4',
      userId: 'client-1',
      clientId: 'client-1',
      clientEmail: 'ranjaniranjani5694@gmail.com',
      therapistId: 'doc-1',
      type: 'PHQ-9',
      title: 'Patient Health Questionnaire-9',
      score: 13,
      maxScore: 27,
      severity: 'Moderate Depression',
      interpretation: 'Baseline intake scoring',
      date: '2026-02-15',
      createdAt: new Date('2026-02-15')
    },
    // PHQ-9 Depression Current
    {
      id: 'score-5',
      userId: 'client-1',
      clientId: 'client-1',
      clientEmail: 'ranjaniranjani5694@gmail.com',
      therapistId: 'doc-1',
      type: 'PHQ-9',
      title: 'Patient Health Questionnaire-9',
      score: 4,
      maxScore: 27,
      severity: 'Minimal / Remission',
      interpretation: '69% clinical outcome recovery',
      date: '2026-03-04',
      createdAt: new Date('2026-03-04')
    }
  ];

  const assessmentScores = rawAssessments.map(a => ({
    ...a,
    _id: a.id
  }));

  await db.collection<any>('AssessmentScore').insertMany(assessmentScores);
  await db.collection<any>('assessment_scores').insertMany(assessmentScores);
  console.log(`✅ [Assessment Scores Inserted] ${assessmentScores.length} longitudinal outcome records`);

  // 10. REAL-TIME CHAT MESSAGES
  const rawMessages = [
    {
      id: 'msg-1',
      senderId: 'client-1',
      senderName: 'Ranjani B',
      receiverId: 'doc-1',
      receiverName: 'Dr. Evelyn Reed',
      content: 'Hello Dr. Evelyn! I practiced the 4-7-8 breathing exercise whenever I felt work tension this week. It helped me stay focused before my client meetings.',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      read: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'msg-2',
      senderId: 'doc-1',
      senderName: 'Dr. Evelyn Reed',
      receiverId: 'client-1',
      receiverName: 'Ranjani B',
      content: 'That is wonderful progress, Ranjani! Notice how training the parasympathetic system prevents the panic reflex from escalating. In our session tomorrow at 10:00 AM, we will layer in cognitive thought-labeling.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: 'msg-3',
      senderId: 'client-1',
      senderName: 'Ranjani B',
      receiverId: 'doc-1',
      receiverName: 'Dr. Evelyn Reed',
      content: 'Sounds great! I also submitted my weekly GAD-7 assessment form just now.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }
  ];

  const messages = rawMessages.map(m => ({
    ...m,
    _id: m.id
  }));

  await db.collection<any>('Message').insertMany(messages);
  await db.collection<any>('messages').insertMany(messages);
  console.log(`✅ [Messages Inserted] ${messages.length} therapist-client chat records`);

  // 11. NOTIFICATIONS
  const rawNotifications = [
    {
      id: 'notif-1',
      userId: 'client-1',
      title: 'Upcoming Session Tomorrow',
      message: 'Your Individual Therapy session with Dr. Evelyn Reed is scheduled for tomorrow at 10:00 AM.',
      type: 'SESSION_REMINDER',
      read: false,
      link: '/client/sessions',
      createdAt: new Date()
    },
    {
      id: 'notif-2',
      userId: 'client-1',
      title: 'Clinical Progress Milestone',
      message: 'Your latest GAD-7 assessment shows a 62% improvement in anxiety scores since baseline!',
      type: 'OUTCOME_ACHIEVED',
      read: false,
      link: '/client/progress',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: 'notif-3',
      userId: 'doc-1',
      title: 'New Session Confirmed',
      message: 'Ranjani B confirmed Individual Psychotherapy for tomorrow at 10:00 AM.',
      type: 'BOOKING_CONFIRMED',
      read: false,
      link: '/consultant/calendar',
      createdAt: new Date()
    },
    {
      id: 'notif-4',
      userId: 'admin-1',
      title: 'System Revenue Milestone',
      message: 'Hexpertify achieved 18 successful bookings this week with $28,400 in gross consultation volume.',
      type: 'FINANCIAL_UPDATE',
      read: false,
      link: '/admin/revenue',
      createdAt: new Date()
    }
  ];

  const notifications = rawNotifications.map(n => ({
    ...n,
    _id: n.id
  }));

  await db.collection<any>('Notification').insertMany(notifications);
  await db.collection<any>('notifications').insertMany(notifications);
  console.log(`✅ [Notifications Inserted] ${notifications.length} notification alerts`);

  // 12. ASSETS & CMS DATA FOR SUPER ADMIN
  const rawAssets = [
    {
      id: 'asset-1',
      name: 'Hexpertify Brand Guidelines 2026.pdf',
      type: 'application/pdf',
      size: '2.4 MB',
      url: '/assets/brand-guidelines.pdf',
      publicId: 'asset-1',
      category: 'OTHER',
      uploadedBy: 'admin-1',
      createdAt: new Date('2025-01-15')
    },
    {
      id: 'asset-2',
      name: 'Clinical Intake Questionnaire Template.pdf',
      type: 'application/pdf',
      size: '850 KB',
      url: '/assets/intake-template.pdf',
      publicId: 'asset-2',
      category: 'OTHER',
      uploadedBy: 'admin-1',
      createdAt: new Date('2025-01-20')
    },
    {
      id: 'asset-3',
      name: 'Dr. Evelyn Reed Official Portrait.jpg',
      type: 'image/jpeg',
      size: '1.2 MB',
      url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      publicId: 'asset-3',
      category: 'CONSULTANT',
      uploadedBy: 'admin-1',
      createdAt: new Date('2025-02-01')
    }
  ];

  const assets = rawAssets.map(a => ({
    ...a,
    _id: a.id
  }));

  await db.collection<any>('Asset').insertMany(assets);
  await db.collection<any>('assets').insertMany(assets);
  console.log(`✅ [Assets Inserted] ${assets.length} administrative media assets`);

  console.log('====================================================');
  console.log('       HEXPERTIFY DATABASE POPULATED SUCCESSFULLY   ');
  console.log('====================================================');
  console.log('🔑 TEST CREDENTIALS:');
  console.log('   🛡️  Super Admin:  admin@hexpertify.com       | password: password123 (or admin123)');
  console.log('   🩺 Practitioner: dr.evelyn@hexpertify.com    | password: password123');
  console.log('   🩺 Practitioner: evelyn.reed@example.com     | password: password123');
  console.log('   🩺 Practitioner: marcus.vance@hexpertify.com  | password: password123');
  console.log('   👤 Client:       ranjaniranjani5694@gmail.com | password: password123');
  console.log('   👤 Client:       sarah@hexpertify.com        | password: password123');
  console.log('====================================================');

  await closeDatabase();
}

seed().catch(err => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
