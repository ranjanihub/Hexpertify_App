import { connectToDatabase, closeDatabase } from '../db/mongodb';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

async function seedAll() {
  console.log('====================================================');
  console.log('   HEXPERTIFY: ADDING DATA TO EVERY COLLECTION      ');
  console.log('====================================================');

  const db = await connectToDatabase();

  // 1. Fetch current consultants and clients so everything relates perfectly
  const consultants = await db.collection<any>('Consultant').find({}).toArray();
  const clients = await db.collection<any>('User').find({ role: { $in: ['USER', 'CLIENT'] } }).toArray();
  const bookings = await db.collection<any>('Booking').find({}).toArray();

  console.log(`Found ${consultants.length} consultants, ${clients.length} clients, ${bookings.length} bookings.`);

  // ----------------------------------------------------------------
  // 1. RESOURCES (`Resource` / `resources`)
  // ----------------------------------------------------------------
  console.log('📚 Populating Resources...');
  const resourcesList = [
    {
      id: 'res-1',
      _id: 'res-1',
      title: 'Understanding Panic & Somatic Grounding Techniques',
      type: 'article',
      category: 'article',
      typeLabel: 'Clinical Article',
      description: 'Practical step-by-step physical grounding tools to de-escalate acute panic attacks and reduce somatic hyperarousal.',
      fullContent: `Panic attacks are sudden surges of overwhelming fear and sympathetic nervous system hyperarousal. By applying somatic grounding, you activate the parasympathetic "rest and digest" pathway. Key steps include the 5-4-3-2-1 sensory scan, physiological sigh breathing (two quick inhales through the nose, long slow exhale through the mouth), and tactile pressure application.`,
      duration: '6 min read',
      readingMinutes: 6,
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&auto=format&fit=crop&q=80',
      author: 'Dr. Evelyn Reed',
      tags: ['Anxiety', 'Panic', 'Grounding', 'Somatic'],
      isRecommended: true,
      isSaved: true,
      isSharedByTherapist: true,
      downloadUrl: '#',
      createdAt: new Date('2025-02-01'),
      updatedAt: new Date()
    },
    {
      id: 'res-2',
      _id: 'res-2',
      title: 'Cognitive Distortions Reference Guide & Worksheet',
      type: 'worksheet',
      category: 'worksheet',
      typeLabel: 'CBT Worksheet',
      description: 'Identify and reframe the 10 most common unhelpful thinking habits with real-life examples and reflection prompts.',
      fullContent: `Cognitive distortions are biased ways of thinking that reinforce negative thoughts or emotions. This worksheet details All-or-Nothing Thinking, Catastrophizing, Mental Filtering, Overgeneralization, and Mind Reading, paired with a structured 3-step evidence test.`,
      duration: '10 min',
      readingMinutes: 10,
      imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=500&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=500&auto=format&fit=crop&q=80',
      author: 'Dr. Marcus Vance',
      tags: ['CBT', 'Cognitive Distortions', 'Worksheet', 'Reframing'],
      isRecommended: true,
      isSaved: false,
      isSharedByTherapist: true,
      downloadUrl: '#',
      createdAt: new Date('2025-02-05'),
      updatedAt: new Date()
    },
    {
      id: 'res-3',
      _id: 'res-3',
      title: '15-Minute Progressive Muscle Relaxation (PMR)',
      type: 'meditation',
      category: 'meditation',
      typeLabel: 'Audio Guide',
      description: 'Guided audio session systematically tensing and relaxing major muscle groups to release chronic physical tension.',
      fullContent: `Progressive Muscle Relaxation (PMR) teaches you to recognize the subtle difference between muscle tension and complete physical relaxation. This guided 15-minute protocol starts at your feet and progressively travels through calves, thighs, abdomen, chest, shoulders, jaw, and forehead.`,
      duration: '15 min audio',
      readingMinutes: 15,
      imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=500&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=500&auto=format&fit=crop&q=80',
      author: 'Dr. Priya Sharma',
      tags: ['Meditation', 'PMR', 'Sleep', 'Stress Relief'],
      isRecommended: true,
      isSaved: true,
      isSharedByTherapist: false,
      downloadUrl: '#',
      createdAt: new Date('2025-02-10'),
      updatedAt: new Date()
    },
    {
      id: 'res-4',
      _id: 'res-4',
      title: 'ADHD Executive Functioning & Focus Masterclass',
      type: 'video',
      category: 'video',
      typeLabel: 'Video Masterclass',
      description: 'Neuroscience-based strategies to overcome task paralysis, manage time blindness, and structure deep-work blocks.',
      fullContent: `In this comprehensive masterclass, Dr. Aravind Swamy deconstructs dopamine regulation in the neurodivergent prefrontal cortex. Discover the Pomodoro 25/5 rhythm, visual external cueing, body doubling, and low-friction initiation techniques.`,
      duration: '22 min video',
      readingMinutes: 22,
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=80',
      author: 'Dr. Aravind Swamy',
      tags: ['ADHD', 'Focus', 'Neuroscience', 'Video'],
      isRecommended: true,
      isSaved: true,
      isSharedByTherapist: true,
      downloadUrl: '#',
      createdAt: new Date('2025-02-15'),
      updatedAt: new Date()
    },
    {
      id: 'res-5',
      _id: 'res-5',
      title: 'Sleep Architecture & Circadian Restoration Protocol',
      type: 'pdf',
      category: 'pdf',
      typeLabel: 'PDF Guide',
      description: 'Comprehensive clinical handbook on light exposure, sleep latency, bedroom thermodynamics, and nocturnal cortisol management.',
      fullContent: `Quality sleep is the fundamental foundation of mental stability. This clinical PDF protocol provides a 6-week progressive roadmap for resetting phase-delayed circadian clocks, eliminating blue light hyperarousal, and optimizing delta slow-wave sleep.`,
      duration: '12 pages',
      readingMinutes: 12,
      imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&auto=format&fit=crop&q=80',
      author: 'Dr. Ethan Walker',
      tags: ['Sleep', 'Circadian', 'Insomnia', 'PDF'],
      isRecommended: false,
      isSaved: false,
      isSharedByTherapist: false,
      downloadUrl: '#',
      createdAt: new Date('2025-02-20'),
      updatedAt: new Date()
    },
    {
      id: 'res-6',
      _id: 'res-6',
      title: 'Values Clarification & Healthy Boundary Matrix',
      type: 'worksheet',
      category: 'worksheet',
      typeLabel: 'ACT Worksheet',
      description: 'Acceptance and Commitment Therapy (ACT) matrix helping clients define non-negotiable personal and professional boundaries.',
      fullContent: `Boundaries are the distance at which I can love both you and me simultaneously. This interactive matrix invites you to categorize relationships into Inner Circle, Professional Sphere, and Acquaintance boundaries with assertive communication scripts.`,
      duration: '8 min',
      readingMinutes: 8,
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&auto=format&fit=crop&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&auto=format&fit=crop&q=80',
      author: 'Dr. David Chen',
      tags: ['Relationships', 'Boundaries', 'ACT', 'Communication'],
      isRecommended: true,
      isSaved: true,
      isSharedByTherapist: true,
      downloadUrl: '#',
      createdAt: new Date('2025-02-25'),
      updatedAt: new Date()
    }
  ];

  await db.collection('Resource').deleteMany({});
  await db.collection('resources').deleteMany({});
  await db.collection('Resource').insertMany(resourcesList as any);
  await db.collection('resources').insertMany(resourcesList as any);
  console.log(`✅ [Resources Synced] ${resourcesList.length} clinical resources.`);

  // ----------------------------------------------------------------
  // 2. ACTIVITIES (`Activity` / `activities`)
  // ----------------------------------------------------------------
  console.log('🧘 Populating Activities...');
  const activitiesList = [
    {
      id: 'ACT-01',
      _id: 'ACT-01',
      name: '5-4-3-2-1 Grounding Technique',
      description: '10-minute guided breathing session focusing on awareness of breath, sensory details, and body sensations.',
      filePath: 'src/activities/templates/GroundingTechnique54321.tsx',
      isVisible: true,
      categoryTag: 'MINDFULNESS',
      duration: '10 min',
      difficulty: 'Easy',
      repeat: 'Daily',
      assignedClientName: 'Ranjani B',
      assignedTherapistName: 'Dr. Evelyn Reed',
      assignedInfo: 'Ranjani B • Daily',
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600',
      templateId: 'ACT-01',
      createdAt: new Date('2025-02-01'),
      updatedAt: new Date()
    },
    {
      id: 'ACT-02',
      _id: 'ACT-02',
      name: 'CBT Automatic Thought Record',
      description: 'Document recent anxiety trigger and write a balanced, rational reframe using Beck 5-column technique.',
      filePath: 'src/activities/templates/CBTThoughtRecord.tsx',
      isVisible: true,
      categoryTag: 'CBT',
      duration: '15 min',
      difficulty: 'Medium',
      repeat: '2-3 Times / Week',
      assignedClientName: 'Aarav Sharma',
      assignedTherapistName: 'Dr. Marcus Vance',
      assignedInfo: 'Aarav Sharma • 2-3 Times / Week',
      imageUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600',
      templateId: 'ACT-02',
      createdAt: new Date('2025-02-05'),
      updatedAt: new Date()
    },
    {
      id: 'ACT-03',
      _id: 'ACT-03',
      name: 'Progressive Muscle Relaxation (PMR)',
      description: 'Guided audio session with pre/post somatic tension sliders to reduce physical stress and muscle tightness.',
      filePath: 'src/activities/templates/ProgressiveMuscleRelaxation.tsx',
      isVisible: true,
      categoryTag: 'SOMATIC',
      duration: '8 min',
      difficulty: 'Easy',
      repeat: 'Daily',
      assignedClientName: 'Ananya Deshmukh',
      assignedTherapistName: 'Dr. Sarah Jenkins',
      assignedInfo: 'Ananya Deshmukh • Daily',
      imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600',
      templateId: 'ACT-03',
      createdAt: new Date('2025-02-10'),
      updatedAt: new Date()
    },
    {
      id: 'ACT-04',
      _id: 'ACT-04',
      name: 'Diaphragmatic Breath Pacing & HRV',
      description: 'Visual biofeedback sphere pacing inhalations (4s), holds (2s), and prolonged exhalations (6s) to activate parasympathetic vagus response.',
      filePath: 'src/activities/templates/DiaphragmaticBreathing.tsx',
      isVisible: true,
      categoryTag: 'BREATHWORK',
      duration: '6 min',
      difficulty: 'Easy',
      repeat: 'Twice Daily',
      assignedClientName: 'Rohan Mehta',
      assignedTherapistName: 'Dr. Aravind Swamy',
      assignedInfo: 'Rohan Mehta • Twice Daily',
      imageUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=600',
      templateId: 'ACT-04',
      createdAt: new Date('2025-02-12'),
      updatedAt: new Date()
    },
    {
      id: 'ACT-05',
      _id: 'ACT-05',
      name: 'Compassionate Self-Dialogue Letter',
      description: 'Expressive therapeutic writing exercise from the viewpoint of an unconditionally loving, compassionate mentor.',
      filePath: 'src/activities/templates/SelfCompassionLetter.tsx',
      isVisible: true,
      categoryTag: 'MINDFULNESS',
      duration: '20 min',
      difficulty: 'Medium',
      repeat: 'Weekly',
      assignedClientName: 'Kavita Krishnan',
      assignedTherapistName: 'Dr. Priya Sharma',
      assignedInfo: 'Kavita Krishnan • Weekly',
      imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600',
      templateId: 'ACT-05',
      createdAt: new Date('2025-02-15'),
      updatedAt: new Date()
    },
    {
      id: 'ACT-06',
      _id: 'ACT-06',
      name: 'Emotion Granularity & Body Wheel',
      description: 'Identify nuanced emotional states beyond anger or sadness, mapping bodily somatic sensations to emotional vocabulary.',
      filePath: 'src/activities/templates/EmotionWheel.tsx',
      isVisible: true,
      categoryTag: 'SOMATIC',
      duration: '10 min',
      difficulty: 'Easy',
      repeat: 'Daily',
      assignedClientName: 'Siddharth Verma',
      assignedTherapistName: 'Dr. David Chen',
      assignedInfo: 'Siddharth Verma • Daily',
      imageUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600',
      templateId: 'ACT-06',
      createdAt: new Date('2025-02-18'),
      updatedAt: new Date()
    }
  ];

  await db.collection('Activity').deleteMany({});
  await db.collection('activities').deleteMany({});
  await db.collection('Activity').insertMany(activitiesList as any);
  await db.collection('activities').insertMany(activitiesList as any);
  console.log(`✅ [Activities Synced] ${activitiesList.length} clinical activities.`);

  // ----------------------------------------------------------------
  // 3. SERVICES (`Service` / `services`)
  // ----------------------------------------------------------------
  console.log('🩺 Populating Services for All 10 Consultants...');
  const servicesList: any[] = [];
  consultants.forEach((c: any, idx: number) => {
    const s1Id = `srv-${idx * 2 + 1}`;
    const s2Id = `srv-${idx * 2 + 2}`;

    servicesList.push({
      _id: s1Id,
      id: s1Id,
      name: `${c.profession} Initial Consultation`,
      title: `${c.profession} Initial Consultation`,
      price: c.hourlyRate,
      amount: c.hourlyRate,
      duration: 50,
      durationMinutes: 50,
      sessionCount: 1,
      platform: 'Google Meet',
      description: `Comprehensive 50-minute clinical consultation focusing on diagnostic intake and tailored therapy planning with ${c.name}.`,
      consultantId: c.id,
      consultantName: c.name,
      professionId: c.professionId,
      active: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date()
    });

    servicesList.push({
      _id: s2Id,
      id: s2Id,
      name: `Specialized ${c.specialties[0] || 'Therapy'} Protocol Session`,
      title: `Specialized ${c.specialties[0] || 'Therapy'} Protocol Session`,
      price: c.hourlyRate,
      amount: c.hourlyRate,
      duration: 50,
      durationMinutes: 50,
      sessionCount: 1,
      platform: 'Google Meet',
      description: `Follow-up structured session advancing clinical milestones and homework integration under evidence-based protocols.`,
      consultantId: c.id,
      consultantName: c.name,
      professionId: c.professionId,
      active: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date()
    });
  });

  await db.collection('Service').deleteMany({});
  await db.collection('services').deleteMany({});
  await db.collection('Service').insertMany(servicesList);
  await db.collection('services').insertMany(servicesList);
  console.log(`✅ [Services Synced] ${servicesList.length} services across 10 consultants.`);

  // ----------------------------------------------------------------
  // 4. ASSESSMENT SCORES & SUBMISSIONS (`AssessmentScore`, `assessment_scores`, `AssessmentSubmission`)
  // ----------------------------------------------------------------
  console.log('📝 Populating Assessment Scores & Submissions...');
  const assessmentScoresList: any[] = [];
  const assessmentAssignmentsList: any[] = [];

  const assessmentTypes = [
    { acronym: 'GAD-7', title: 'Generalized Anxiety Disorder 7 (GAD-7)', max: 21 },
    { acronym: 'PHQ-9', title: 'Patient Health Questionnaire 9 (PHQ-9)', max: 27 },
    { acronym: 'PSS-10', title: 'Perceived Stress Scale (PSS-10)', max: 40 }
  ];

  clients.slice(0, 30).forEach((client: any, idx: number) => {
    const aType = assessmentTypes[idx % assessmentTypes.length];
    const score = 5 + (idx % (aType.max - 6));
    const scoreId = `ASC-${100 + idx}`;
    const assignId = `ASN-${100 + idx}`;

    let severityLabel = 'Mild';
    let severityColor = 'bg-emerald-500 text-white';
    let flaggedRisk = false;

    if (score >= (aType.max * 0.65)) {
      severityLabel = 'Severe Elevation';
      severityColor = 'bg-rose-600 text-white';
      flaggedRisk = true;
    } else if (score >= (aType.max * 0.4)) {
      severityLabel = 'Moderate';
      severityColor = 'bg-amber-500 text-white';
    }

    const subDate = new Date(Date.now() - (idx * 2 + 1) * 86400000);

    const scoreDoc = {
      _id: scoreId,
      id: scoreId,
      assessmentId: `ASS-${aType.acronym}`,
      assessmentAcronym: aType.acronym,
      assessmentTitle: aType.title,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      consultantId: client.assignedTherapistId,
      consultantName: client.assignedTherapistName,
      therapistName: client.assignedTherapistName,
      totalScore: score,
      maxScore: aType.max,
      severityLabel,
      severityColor,
      flaggedRisk,
      completedAt: subDate,
      createdAt: subDate,
      updatedAt: subDate,
      responses: {
        'Q1': (score % 4),
        'Q2': ((score + 1) % 4),
        'Q3': ((score + 2) % 4),
        'Q4': (score % 3),
        'Q5': ((score + 1) % 3)
      }
    };

    assessmentScoresList.push(scoreDoc);

    // Also create matching assignment record
    const assignDoc = {
      _id: assignId,
      id: assignId,
      assessmentId: `ASS-${aType.acronym}`,
      assessmentAcronym: aType.acronym,
      assessmentTitle: aType.title,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      consultantId: client.assignedTherapistId,
      consultantName: client.assignedTherapistName,
      therapistName: client.assignedTherapistName,
      status: 'COMPLETED',
      assignedDate: new Date(subDate.getTime() - 86400000 * 3).toISOString().split('T')[0],
      dueDate: subDate.toISOString().split('T')[0],
      notes: 'Please complete this clinical baseline inventory prior to our upcoming consultation.',
      createdAt: new Date(subDate.getTime() - 86400000 * 3),
      updatedAt: subDate
    };

    assessmentAssignmentsList.push(assignDoc);
  });

  // Also add 5 pending assignments for active clients
  clients.slice(30, 35).forEach((client: any, idx: number) => {
    const aType = assessmentTypes[idx % assessmentTypes.length];
    const assignId = `ASN-PENDING-${idx + 1}`;
    assessmentAssignmentsList.push({
      _id: assignId,
      id: assignId,
      assessmentId: `ASS-${aType.acronym}`,
      assessmentAcronym: aType.acronym,
      assessmentTitle: aType.title,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      consultantId: client.assignedTherapistId,
      consultantName: client.assignedTherapistName,
      therapistName: client.assignedTherapistName,
      status: 'PENDING',
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      notes: 'Follow-up clinical assessment to measure progress over past 4 sessions.',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  await db.collection('AssessmentScore').deleteMany({});
  await db.collection('assessment_scores').deleteMany({});
  await db.collection('AssessmentSubmission').deleteMany({});
  await db.collection('assessment_submissions').deleteMany({});
  await db.collection('AssessmentAssignment').deleteMany({});
  await db.collection('assessment_assignments').deleteMany({});

  await db.collection('AssessmentScore').insertMany(assessmentScoresList);
  await db.collection('assessment_scores').insertMany(assessmentScoresList);
  await db.collection('AssessmentSubmission').insertMany(assessmentScoresList);
  await db.collection('assessment_submissions').insertMany(assessmentScoresList);
  await db.collection('AssessmentAssignment').insertMany(assessmentAssignmentsList);
  await db.collection('assessment_assignments').insertMany(assessmentAssignmentsList);

  console.log(`✅ [Assessments Synced] ${assessmentScoresList.length} scores/submissions, ${assessmentAssignmentsList.length} assignments.`);

  // ----------------------------------------------------------------
  // 5. SLOTS & AVAILABILITY (`Slot`, `slots`, `Availability`)
  // ----------------------------------------------------------------
  console.log('🗓️ Populating Slots & Availability Calendar...');
  const slotsList: any[] = [];
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  consultants.forEach((c: any, cIdx: number) => {
    daysOfWeek.forEach((day, dIdx) => {
      const slotId = `SLOT-${cIdx + 1}-${dIdx + 1}`;
      const dOffset = (dIdx - new Date().getDay() + 7) % 7;
      const targetDate = new Date(Date.now() + dOffset * 86400000);
      const isBooked = (dIdx % 2 === 0);

      slotsList.push({
        _id: slotId,
        id: slotId,
        therapistId: c.id,
        therapistName: c.name,
        consultantId: c.id,
        consultantName: c.name,
        dayOfWeek: day,
        date: targetDate.toISOString().split('T')[0],
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        durationMinutes: 50,
        status: isBooked ? 'Booked' : 'Available',
        clientName: isBooked ? (clients[cIdx * 10]?.name || 'Patient Consultation') : 'Open Consultation Slot',
        clientEmail: isBooked ? (clients[cIdx * 10]?.email || 'client@example.com') : '',
        sessionType: 'Google Meet',
        price: c.hourlyRate,
        createdAt: new Date('2025-02-01'),
        updatedAt: new Date()
      });
    });
  });

  await db.collection('Slot').deleteMany({});
  await db.collection('slots').deleteMany({});
  await db.collection('Availability').deleteMany({});

  await db.collection('Slot').insertMany(slotsList);
  await db.collection('slots').insertMany(slotsList);
  await db.collection('Availability').insertMany(slotsList);
  console.log(`✅ [Slots & Availability Synced] ${slotsList.length} availability slots.`);

  // ----------------------------------------------------------------
  // 6. PAYOUTS (`Payout` / `payouts`)
  // ----------------------------------------------------------------
  console.log('💳 Populating Practitioner Payouts...');
  const payoutsList = consultants.map((c: any, idx: number) => {
    const pId = `PAY-${100 + idx + 1}`;
    const sessionsCount = 18 + (idx * 3);
    const amount = sessionsCount * c.hourlyRate * 0.85; // 85% practitioner share

    return {
      _id: pId,
      id: pId,
      therapistId: c.id,
      therapistName: c.name,
      therapistAvatar: c.photo,
      profession: c.profession,
      amount: Math.round(amount),
      pendingAmount: idx % 3 === 0 ? Math.round(c.hourlyRate * 4 * 0.85) : 0,
      pendingReportsCount: idx % 3 === 0 ? 4 : 0,
      sessionsCount,
      lastSessionDate: new Date(Date.now() - (idx + 1) * 86400000 * 2).toISOString().split('T')[0],
      status: idx % 3 === 0 ? 'Pending Review' : 'Paid',
      period: 'August 2026',
      payoutMethod: 'Direct Bank NEFT',
      bankDetails: {
        bankName: 'HDFC Bank',
        accountNumber: '****' + (String(1000 + idx * 72)).slice(-4),
        ifscCode: 'HDFC0001234'
      },
      unpaidSessions: [
        {
          id: `SR-${c.id}-01`,
          sessionId: `SESS-${c.id}-101`,
          sessionDate: '2026-08-25',
          clientName: clients[idx * 5]?.name || 'Patient Client',
          sessionFee: c.hourlyRate,
          status: 'Approved',
          notes: 'Completed consultation with clinical summary filed'
        }
      ],
      createdAt: new Date('2025-08-01'),
      updatedAt: new Date()
    };
  });

  await db.collection('Payout').deleteMany({});
  await db.collection('payouts').deleteMany({});
  await db.collection('Payout').insertMany(payoutsList as any);
  await db.collection('payouts').insertMany(payoutsList as any);
  console.log(`✅ [Payouts Synced] ${payoutsList.length} practitioner payout statements.`);

  // ----------------------------------------------------------------
  // 7. MESSAGES (`Message` / `messages`)
  // ----------------------------------------------------------------
  console.log('💬 Populating Messages & Conversation Threads...');
  const messagesList: any[] = [];
  
  // Create realistic conversations between first 15 clients and their assigned consultants
  clients.slice(0, 15).forEach((client: any, idx: number) => {
    const c = consultants.find((con: any) => con.id === client.assignedTherapistId) || consultants[0];
    const m1Id = `MSG-${100 + idx * 2}`;
    const m2Id = `MSG-${101 + idx * 2}`;
    const pastTime1 = new Date(Date.now() - (idx + 1) * 3600000 * 6);
    const pastTime2 = new Date(Date.now() - (idx + 1) * 3600000 * 2);

    messagesList.push({
      _id: m1Id,
      id: m1Id,
      senderRole: 'therapist',
      senderName: c.name,
      senderEmail: c.email,
      recipientRole: 'client',
      recipientName: client.name,
      recipientEmail: client.email,
      consultantId: c.id,
      consultantName: c.name,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      content: `Hello ${client.name}! Looking forward to our upcoming consultation session. Please take a couple of minutes to review your latest activity worksheet when you have time.`,
      read: true,
      createdAt: pastTime1,
      updatedAt: pastTime1
    });

    messagesList.push({
      _id: m2Id,
      id: m2Id,
      senderRole: 'client',
      senderName: client.name,
      senderEmail: client.email,
      recipientRole: 'therapist',
      recipientName: c.name,
      recipientEmail: c.email,
      consultantId: c.id,
      consultantName: c.name,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      content: `Hi ${c.name}, thank you! The 5-4-3-2-1 grounding exercise has been really helpful this week. Looking forward to speaking soon.`,
      read: true,
      createdAt: pastTime2,
      updatedAt: pastTime2
    });
  });

  await db.collection('Message').deleteMany({});
  await db.collection('messages').deleteMany({});
  await db.collection('Message').insertMany(messagesList);
  await db.collection('messages').insertMany(messagesList);
  console.log(`✅ [Messages Synced] ${messagesList.length} chat messages.`);

  // ----------------------------------------------------------------
  // 8. NOTIFICATIONS (`Notification` / `notifications`)
  // ----------------------------------------------------------------
  console.log('🔔 Populating System & User Notifications...');
  const notificationsList = [
    {
      _id: 'notif-1',
      id: 'notif-1',
      role: 'ADMIN',
      recipientRole: 'ADMIN',
      type: 'ADMIN_ALERT',
      title: 'Database Synchronization Healthy',
      message: 'All 10 clinical practitioners and registered clients are active with verified credentials.',
      time: '10m ago',
      read: false,
      createdAt: new Date()
    },
    {
      _id: 'notif-2',
      id: 'notif-2',
      role: 'ADMIN',
      recipientRole: 'ADMIN',
      type: 'NEW_BOOKING_ALERT',
      title: 'New Confirmed Consultation',
      message: 'Ranjani B confirmed a clinical consultation with Dr. Evelyn Reed.',
      time: '1h ago',
      read: true,
      createdAt: new Date(Date.now() - 3600000)
    },
    {
      _id: 'notif-3',
      id: 'notif-3',
      role: 'CLIENT',
      recipientRole: 'CLIENT',
      recipientEmail: 'ranjaniranjani5694@gmail.com',
      userEmail: 'ranjaniranjani5694@gmail.com',
      type: 'outcome',
      title: 'Clinical Assessment Outcome Updated',
      description: 'Your GAD-7 Anxiety Inventory outcome has been calibrated: score reduced from 14 to 8 (-6 points).',
      metricName: 'Anxiety & Worry:',
      scoreChange: '14 → 8',
      pointsLabel: '-6 points',
      sessionTag: 'Assessment completed after Session 3.',
      time: '25m ago',
      read: false,
      link: '/progress',
      createdAt: new Date(Date.now() - 1500000)
    },
    {
      _id: 'notif-4',
      id: 'notif-4',
      role: 'CLIENT',
      recipientRole: 'CLIENT',
      recipientEmail: 'ranjaniranjani5694@gmail.com',
      userEmail: 'ranjaniranjani5694@gmail.com',
      type: 'message',
      title: 'New Message from Dr. Evelyn Reed',
      description: 'Great work applying the diaphragmatic breathwork during your morning routine!',
      time: '2h ago',
      read: true,
      link: '/messages',
      createdAt: new Date(Date.now() - 7200000)
    },
    {
      _id: 'notif-5',
      id: 'notif-5',
      role: 'CONSULTANT',
      recipientRole: 'CONSULTANT',
      recipientEmail: 'dr.evelyn@hexpertify.com',
      type: 'SESSION_REMINDER',
      title: 'Upcoming Session Today',
      description: 'Virtual consultation scheduled with Ranjani B at 10:00 AM.',
      time: '3h ago',
      read: true,
      createdAt: new Date(Date.now() - 10800000)
    }
  ];

  await db.collection('Notification').deleteMany({});
  await db.collection('notifications').deleteMany({});
  await db.collection('Notification').insertMany(notificationsList as any);
  await db.collection('notifications').insertMany(notificationsList as any);
  console.log(`✅ [Notifications Synced] ${notificationsList.length} notifications.`);

  // ----------------------------------------------------------------
  // 9. ASSETS (`Asset` / `assets`)
  // ----------------------------------------------------------------
  console.log('📁 Populating Administrative & Media Assets...');
  const assetsList = [
    {
      _id: 'asset-1',
      id: 'asset-1',
      name: 'Hexpertify Brand & Clinical Care Guidelines 2026.pdf',
      category: 'OTHER',
      type: 'application/pdf',
      size: '2.4 MB',
      url: '/assets/brand-guidelines.pdf',
      publicId: 'hex-brand-2026',
      uploadedBy: 'admin-1',
      createdAt: new Date('2025-01-15')
    },
    {
      _id: 'asset-2',
      id: 'asset-2',
      name: 'Standard Adult Clinical Intake Form Template.pdf',
      category: 'OTHER',
      type: 'application/pdf',
      size: '850 KB',
      url: '/assets/intake-template.pdf',
      publicId: 'hex-intake-form',
      uploadedBy: 'admin-1',
      createdAt: new Date('2025-01-20')
    },
    {
      _id: 'asset-3',
      id: 'asset-3',
      name: 'Dr. Evelyn Reed Official Clinical Portrait.jpg',
      category: 'CONSULTANT',
      type: 'image/jpeg',
      size: '1.2 MB',
      url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      publicId: 'portrait-evelyn-reed',
      uploadedBy: 'admin-1',
      createdAt: new Date('2025-02-01')
    },
    {
      _id: 'asset-4',
      id: 'asset-4',
      name: 'Dr. Marcus Vance Official Clinical Portrait.jpg',
      category: 'CONSULTANT',
      type: 'image/jpeg',
      size: '1.1 MB',
      url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
      publicId: 'portrait-marcus-vance',
      uploadedBy: 'admin-1',
      createdAt: new Date('2025-02-01')
    },
    {
      _id: 'asset-5',
      id: 'asset-5',
      name: 'CBT Thought Restructuring 5-Column Template.pdf',
      category: 'PROFESSIONAL',
      type: 'application/pdf',
      size: '420 KB',
      url: '/assets/cbt-5column-worksheet.pdf',
      publicId: 'worksheet-cbt-thought-record',
      uploadedBy: 'admin-1',
      createdAt: new Date('2025-02-10')
    },
    {
      _id: 'asset-6',
      id: 'asset-6',
      name: 'Hexpertify Live Platform Hero Banner.jpg',
      category: 'BANNER',
      type: 'image/jpeg',
      size: '3.1 MB',
      url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&auto=format&fit=crop&q=80',
      publicId: 'banner-live-hero',
      uploadedBy: 'admin-1',
      createdAt: new Date('2025-01-05')
    }
  ];

  await db.collection('Asset').deleteMany({});
  await db.collection('assets').deleteMany({});
  await db.collection('Asset').insertMany(assetsList as any);
  await db.collection('assets').insertMany(assetsList as any);
  console.log(`✅ [Assets Synced] ${assetsList.length} media assets.`);

  // ----------------------------------------------------------------
  // 10. HOMEPAGE CMS (`userinterfaces`)
  // ----------------------------------------------------------------
  console.log('🖥️ Populating Homepage CMS (userinterfaces)...');
  const homepageConfig = {
    _id: 'ui-homepage',
    id: 'ui-homepage',
    type: 'homepage',
    general: {
      pageIdentifier: 'home',
      notificationTitle: 'Welcome to Hexpertify - Certified Mental Healthcare Platform'
    },
    carouselImages: [
      {
        id: 'car-1',
        url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&auto=format&fit=crop&q=80',
        altText: 'Compassionate licensed clinical psychologists in virtual session',
        isMobile: false
      },
      {
        id: 'car-2',
        url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&auto=format&fit=crop&q=80',
        altText: 'Evidence-based mindfulness and nervous system regulation therapy',
        isMobile: false
      }
    ],
    seo: {
      metaTitle: 'Hexpertify | Premium Virtual Psychological Care & Teletherapy',
      metaDescription: 'Connect with certified clinical psychologists, neuropsychiatrists, and licensed therapists for individual, couples, and family teletherapy.',
      keywords: 'psychologist, teletherapy, mental health, CBT, psychiatry, hexpertify',
      openGraphTitle: 'Hexpertify | Evidence-Based Psychological Consultations',
      openGraphDescription: 'Connect with board-certified clinical psychologists and psychiatrists.',
      openGraphImageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80',
      openGraphImageAltText: 'Certified Hexpertify Psychologist'
    },
    faqs: [
      { question: 'How do virtual therapy sessions work on Hexpertify?', answer: 'Sessions are conducted securely over encrypted HD video (Google Meet). You receive an instant meeting link upon booking confirmation.' },
      { question: 'Are all practitioners licensed and verified?', answer: 'Yes. Every psychologist and psychiatrist on Hexpertify undergoes rigorous credential verification, license confirmation, and background vetting.' },
      { question: 'Is my consultation data completely confidential?', answer: 'Yes, Hexpertify maintains strict end-to-end privacy and confidentiality protocols complying with international clinical standards.' },
      { question: 'Can I reschedule or cancel my appointment?', answer: 'You can easily reschedule or cancel any session up to 12 hours before the scheduled time directly from your dashboard.' }
    ],
    testimonials: [
      {
        quote: 'Working with Dr. Evelyn Reed transformed my relationship with anxiety. The somatic tools gave me my life back.',
        authorName: 'Ranjani B',
        authorProfessional: 'Product Director',
        authorImageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
      },
      {
        quote: 'Dr. Vance breaks down complex mental habits into simple, actionable daily exercises. Highly recommended.',
        authorName: 'Aarav Sharma',
        authorProfessional: 'Software Architect',
        authorImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
      }
    ],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date()
  };

  await db.collection('userinterfaces').deleteMany({});
  await db.collection('userinterfaces').insertOne(homepageConfig as any);
  console.log(`✅ [userinterfaces Synced] Homepage CMS configured.`);

  // ----------------------------------------------------------------
  // 11. PAGES (`Page` / `pages`)
  // ----------------------------------------------------------------
  console.log('📄 Populating CMS Pages...');
  const rawPages = [
    { id: 'page-home', identifier: 'home', notificationTitle: 'Welcome to Hexpertify - Certified Mental Healthcare' },
    { id: 'page-about', identifier: 'about', notificationTitle: 'About Hexpertify Clinical Healthcare' },
    { id: 'page-consultants', identifier: 'consultants', notificationTitle: 'Find Certified Licensed Therapists & Psychiatrists' },
    { id: 'page-services', identifier: 'services', notificationTitle: 'Evidence-Based Psychotherapy & Neuropsychiatry Services' },
    { id: 'page-contact', identifier: 'contact', notificationTitle: 'Contact Hexpertify Care Coordination Team' }
  ];

  const pageSeoMetas: any[] = [];
  const pagesList = rawPages.map((p, idx) => {
    const sId = new ObjectId().toString();
    pageSeoMetas.push({
      _id: sId,
      id: sId,
      metaTitle: `${p.notificationTitle} | Hexpertify`,
      metaDescription: `${p.notificationTitle} - Professional mental health consultations.`,
      metaKeywords: ['therapy', 'hexpertify', p.identifier],
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date()
    });

    return {
      _id: p.id,
      id: p.id,
      identifier: p.identifier,
      notificationTitle: p.notificationTitle,
      carouselImageUrls: idx === 0 ? ['https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200'] : [],
      carouselImageAltTexts: idx === 0 ? ['Hexpertify Therapy Platform'] : [],
      carouselImageIsMobileFlags: idx === 0 ? [false] : [],
      faqs: idx === 0 ? [
        { question: 'How do I get started?', answer: 'Browse our directory of 10 certified practitioners, select a specialty, and book your consultation.' }
      ] : [],
      testimonials: idx === 0 ? [
        { quote: 'Exceptional care and seamless platform experience.', authorName: 'Pooja Gupta', authorProfessional: 'Design Lead' }
      ] : [],
      seoMetaId: sId,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date()
    };
  });

  await db.collection('SeoMeta').insertMany(pageSeoMetas);
  await db.collection('seo_metas').insertMany(pageSeoMetas);

  await db.collection('Page').deleteMany({});
  await db.collection('pages').deleteMany({});
  await db.collection('Page').insertMany(pagesList as any);
  await db.collection('pages').insertMany(pagesList as any);
  console.log(`✅ [Pages Synced] ${pagesList.length} CMS pages with unique SEO metadata.`);

  // ----------------------------------------------------------------
  // 12. GOALS (`Goal` / `goals`)
  // ----------------------------------------------------------------
  console.log('🎯 Populating Clinical Goals...');
  const goalsList: any[] = [];
  clients.slice(0, 25).forEach((client: any, idx: number) => {
    goalsList.push({
      _id: `goal-${idx + 1}`,
      id: `goal-${idx + 1}`,
      clientId: client.id,
      clientName: client.name,
      title: client.primaryGoal || 'Anxiety & Emotion Regulation',
      description: 'Structured clinical objective established in intake care plan.',
      status: idx % 4 === 0 ? 'ACHIEVED' : 'IN_PROGRESS',
      progress: idx % 4 === 0 ? 100 : 50 + (idx * 5) % 45,
      targetDate: '2026-10-15',
      therapistId: client.assignedTherapistId,
      therapistName: client.assignedTherapistName,
      createdAt: new Date('2025-02-01'),
      updatedAt: new Date()
    });
  });

  await db.collection('Goal').deleteMany({});
  await db.collection('goals').deleteMany({});
  await db.collection('Goal').insertMany(goalsList);
  await db.collection('goals').insertMany(goalsList);
  console.log(`✅ [Goals Synced] ${goalsList.length} clinical goals.`);

  // ----------------------------------------------------------------
  // 13. SESSIONS (`Session` / `sessions`)
  // ----------------------------------------------------------------
  console.log('🔑 Populating NextAuth User Sessions...');
  const sessionsList = [
    {
      _id: new ObjectId().toString(),
      sessionToken: 'hex-session-token-admin',
      userId: 'admin-1',
      expires: new Date(Date.now() + 30 * 86400000),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId().toString(),
      sessionToken: 'hex-session-token-ranjani',
      userId: 'client-1',
      expires: new Date(Date.now() + 30 * 86400000),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId().toString(),
      sessionToken: 'hex-session-token-evelyn',
      userId: 'doc-1',
      expires: new Date(Date.now() + 30 * 86400000),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId().toString(),
      sessionToken: 'hex-session-token-marcus',
      userId: 'doc-2',
      expires: new Date(Date.now() + 30 * 86400000),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await db.collection('Session').deleteMany({});
  await db.collection('sessions').deleteMany({});
  await db.collection('Session').insertMany(sessionsList as any);
  await db.collection('sessions').insertMany(sessionsList as any);
  console.log(`✅ [Sessions Synced] ${sessionsList.length} active sessions.`);

  // ----------------------------------------------------------------
  // 14. ACCOUNTS (`Account` / `accounts`)
  // ----------------------------------------------------------------
  console.log('🔐 Populating NextAuth Accounts...');
  const accountsList = [
    {
      _id: new ObjectId().toString(),
      userId: 'admin-1',
      type: 'credentials',
      provider: 'credentials',
      providerAccountId: 'admin@hexpertify.com',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId().toString(),
      userId: 'client-1',
      type: 'oauth',
      provider: 'google',
      providerAccountId: '10928374659283746',
      createdAt: new Date('2025-02-01'),
      updatedAt: new Date()
    },
    {
      _id: new ObjectId().toString(),
      userId: 'doc-1',
      type: 'credentials',
      provider: 'credentials',
      providerAccountId: 'dr.evelyn@hexpertify.com',
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date()
    }
  ];

  await db.collection('Account').deleteMany({});
  await db.collection('accounts').deleteMany({});
  await db.collection('Account').insertMany(accountsList as any);
  await db.collection('accounts').insertMany(accountsList as any);
  console.log(`✅ [Accounts Synced] ${accountsList.length} authentication accounts.`);

  // ----------------------------------------------------------------
  // 15. VERIFICATION TOKENS & REFRESH TOKENS (`VerificationToken`, `refreshtokens`)
  // ----------------------------------------------------------------
  console.log('🎟️ Populating Verification & Refresh Tokens...');
  const verTokens = [
    {
      _id: new ObjectId().toString(),
      identifier: 'ranjaniranjani5694@gmail.com',
      token: 'tok-verify-client-ranjani-9821',
      expires: new Date(Date.now() + 86400000 * 7),
      createdAt: new Date()
    },
    {
      _id: new ObjectId().toString(),
      identifier: 'admin@hexpertify.com',
      token: 'tok-verify-admin-master-0012',
      expires: new Date(Date.now() + 86400000 * 14),
      createdAt: new Date()
    }
  ];

  const refreshTokens = [
    {
      _id: new ObjectId().toString(),
      token: 'hex-refresh-token-session-client-1',
      userId: 'client-1',
      expiresAt: new Date(Date.now() + 86400000 * 30),
      createdAt: new Date()
    },
    {
      _id: new ObjectId().toString(),
      token: 'hex-refresh-token-session-admin',
      userId: 'admin-1',
      expiresAt: new Date(Date.now() + 86400000 * 30),
      createdAt: new Date()
    }
  ];

  await db.collection('VerificationToken').deleteMany({});
  await db.collection('VerificationToken').insertMany(verTokens as any);

  await db.collection('refreshtokens').deleteMany({});
  await db.collection('refreshtokens').insertMany(refreshTokens as any);
  console.log(`✅ [Tokens Synced] Verification & Refresh tokens populated.`);

  // ----------------------------------------------------------------
  // 16. AUTHENTICATOR (`Authenticator`)
  // ----------------------------------------------------------------
  console.log('🛡️ Populating WebAuthn / Passkey Authenticator...');
  const authenticators = [
    {
      _id: 'auth-cred-admin-01',
      credentialID: 'auth-cred-admin-01',
      userId: 'admin-1',
      providerAccountId: 'admin@hexpertify.com',
      credentialPublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEAdminPasskeyPublicKeyExample...',
      counter: 12,
      credentialDeviceType: 'multiDevice',
      credentialBackedUp: true,
      transports: 'internal,hybrid',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date()
    },
    {
      _id: 'auth-cred-client-01',
      credentialID: 'auth-cred-client-01',
      userId: 'client-1',
      providerAccountId: 'ranjaniranjani5694@gmail.com',
      credentialPublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEClientPasskeyPublicKeyExample...',
      counter: 4,
      credentialDeviceType: 'singleDevice',
      credentialBackedUp: true,
      transports: 'internal',
      createdAt: new Date('2025-02-01'),
      updatedAt: new Date()
    }
  ];

  await db.collection('Authenticator').deleteMany({});
  await db.collection('Authenticator').insertMany(authenticators as any);
  console.log(`✅ [Authenticator Synced] ${authenticators.length} passkey authenticators.`);

  // ----------------------------------------------------------------
  // 17. EMAIL LOGS (`EmailLog`, `email_logs`)
  // ----------------------------------------------------------------
  console.log('📧 Populating Email Logs...');
  const emailLogsList = [
    {
      _id: 'email-1',
      id: 'email-1',
      to: 'ranjaniranjani5694@gmail.com',
      from: 'noreply@hexpertify.com',
      subject: 'Booking Confirmed: Individual Psychotherapy Consultation',
      template: 'booking-confirmation',
      status: 'DELIVERED',
      sentAt: new Date(Date.now() - 3600000 * 24),
      metadata: { bookingId: 'BK-1-PAST', consultantName: 'Dr. Evelyn Reed' },
      createdAt: new Date(Date.now() - 3600000 * 24)
    },
    {
      _id: 'email-2',
      id: 'email-2',
      to: 'ranjaniranjani5694@gmail.com',
      from: 'care@hexpertify.com',
      subject: 'Reminder: Clinical Session Tomorrow with Dr. Evelyn Reed',
      template: 'session-reminder',
      status: 'DELIVERED',
      sentAt: new Date(Date.now() - 3600000 * 4),
      metadata: { bookingId: 'BK-1-UPCOMING', time: '10:00 AM' },
      createdAt: new Date(Date.now() - 3600000 * 4)
    },
    {
      _id: 'email-3',
      id: 'email-3',
      to: 'dr.evelyn@hexpertify.com',
      from: 'system@hexpertify.com',
      subject: 'New Client Intake Completed: Ranjani B',
      template: 'practitioner-new-client',
      status: 'DELIVERED',
      sentAt: new Date(Date.now() - 3600000 * 48),
      metadata: { clientId: 'client-1' },
      createdAt: new Date(Date.now() - 3600000 * 48)
    },
    {
      _id: 'email-4',
      id: 'email-4',
      to: 'admin@hexpertify.com',
      from: 'alerts@hexpertify.com',
      subject: 'Weekly Platform Metrics Summary: 100 Clients Active',
      template: 'admin-weekly-digest',
      status: 'DELIVERED',
      sentAt: new Date(Date.now() - 3600000 * 12),
      metadata: { totalClients: 100, activePractitioners: 10 },
      createdAt: new Date(Date.now() - 3600000 * 12)
    }
  ];

  await db.collection('EmailLog').deleteMany({});
  await db.collection('email_logs').deleteMany({});
  await db.collection('EmailLog').insertMany(emailLogsList as any);
  await db.collection('email_logs').insertMany(emailLogsList as any);
  console.log(`✅ [EmailLog Synced] ${emailLogsList.length} transactional email logs.`);

  console.log('====================================================');
  console.log('   🎉 ALL COLLECTIONS POPULATED SUCCESSFULLY!       ');
  console.log('====================================================');

  await closeDatabase();
}

seedAll().catch(err => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
