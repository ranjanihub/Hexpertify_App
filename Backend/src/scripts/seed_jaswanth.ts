import { connectToDatabase, closeDatabase } from '../db/mongodb';
import bcrypt from 'bcryptjs';

async function seedJaswanth() {
  const db = await connectToDatabase();
  const hashedPassword = await bcrypt.hash('password123', 10);

  const jayaConsId = 'therapist-1789365881877';
  const jayaConsName = 'Dr. Jayakumar';
  const jayaConsEmail = 'zoya.milly01@gmail.com';
  const jayaConsPhoto = 'https://media.licdn.com/dms/image/v2/D5603AQFTS1Z73WIlCg/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1720859777245?e=2147483647&v=beta&t=yO7E_-3xylunJKT00b03-m9hTVuicUz6qszqtZVflqs';

  const client = {
    id: 'USR-JASWANTH-70585',
    name: 'Jaswanth Jegan',
    email: 'jaswanthjegan70585@gmail.com',
    phone: '+91 98765 70585',
    age: 24,
    gender: 'Male',
    preferredLanguage: 'English',
    image: 'https://lh3.googleusercontent.com/a/ACg8ocLiRZOxceBbw6v0vOhjOkkABN_YjYj91GM6OjIIHZn0atmTdZua=s96-c',
    primaryGoal: 'Peak Performance, Focus & Anxiety Management',
    bookingId: 'BK-JASWANTH-001',
    bookingDate: '2026-09-20',
    bookingTime: '10:00 AM',
    scheduledAt: '2026-09-20T10:00:00.000Z'
  };

  const clientDoc: any = {
    id: client.id,
    name: client.name,
    email: client.email.toLowerCase().trim(),
    password: hashedPassword,
    role: 'USER',
    roles: ['CLIENT', 'USER'],
    status: 'Active',
    phone: client.phone,
    phoneNumber: client.phone,
    age: client.age,
    gender: client.gender,
    preferredLanguage: client.preferredLanguage,
    avatarUrl: client.image,
    image: client.image,
    assignedTherapistId: jayaConsId,
    assignedTherapistName: jayaConsName,
    assignedTherapistEmail: jayaConsEmail,
    assignedTherapistPhoto: jayaConsPhoto,
    therapistPhoto: jayaConsPhoto,
    service: 'Individual Therapy Session',
    firstConsultationCompleted: true,
    emailVerified: true,
    primaryGoal: client.primaryGoal,
    primaryConcern: client.primaryGoal,
    therapyGoals: [
      `Achieve sustainable focus, clarity, and regulation in ${client.primaryGoal.toLowerCase()}`,
      'Incorporate daily 10-minute mindfulness & somatic grounding exercises',
      'Reflect on emotional triggers using structured CBT thought logs'
    ],
    goals: [
      {
        id: `goal-${client.id}-1`,
        title: 'Daily Focus & Mindfulness Practice',
        targetDate: '2026-10-15',
        status: 'In Progress',
        progress: 80
      },
      {
        id: `goal-${client.id}-2`,
        title: 'CBT Cognitive Restructuring Routine',
        targetDate: '2026-11-01',
        status: 'In Progress',
        progress: 65
      },
      {
        id: `goal-${client.id}-3`,
        title: 'Stress Resilience & Boundary Management',
        targetDate: '2026-11-15',
        status: 'In Progress',
        progress: 50
      }
    ],
    aiIntakeSummary: `Client ${client.name} presented with primary goals targeting "${client.primaryGoal}". Demonstrates high motivation and strong self-awareness. Assigned to practitioner ${jayaConsName} for dedicated individual psychotherapy.`,
    intakeResponses: {
      'Presenting Concern': client.primaryGoal,
      'Duration of Symptoms': '1 to 3 months',
      'Previous Therapy Experience': 'Looking forward to clinical guidance',
      'Daily Sleep Quality': 'Good, working on consistent schedule',
      'Emergency Contact': `${client.name} Emergency Contact - +91 98765 00000`,
      'Preferred Session Time': 'Morning slots (10:00 AM - 12:00 PM)'
    },
    assessmentScores: [
      {
        name: 'GAD-7 (Anxiety)',
        score: 4,
        maxScore: 21,
        date: '2026-09-14',
        severity: 'Minimal'
      },
      {
        name: 'PHQ-9 (Depression)',
        score: 3,
        maxScore: 27,
        date: '2026-09-14',
        severity: 'Minimal'
      }
    ],
    moodScores: [
      { date: '2026-09-10', score: 7 },
      { date: '2026-09-12', score: 8 },
      { date: '2026-09-13', score: 8 },
      { date: '2026-09-14', score: 9 }
    ],
    moodLogs: [
      {
        date: '2026-09-12',
        mood: 'Calm',
        score: 8,
        notes: 'Focused and feeling clear after morning breathwork.'
      },
      {
        date: '2026-09-14',
        mood: 'Optimistic',
        score: 9,
        notes: 'Looking forward to consultation session with Dr. Jayakumar.'
      }
    ],
    homeworkAssigned: [
      {
        title: '5-Minute Box Breathing Grounding Technique',
        dueDate: '2026-09-20',
        completed: false
      },
      {
        title: 'Initial Reflection & Wellness Check-in',
        dueDate: '2026-09-18',
        completed: true
      }
    ],
    homework: [
      {
        title: '5-Minute Box Breathing Grounding Technique',
        dueDate: '2026-09-20',
        status: 'Pending'
      },
      {
        title: 'Initial Reflection & Wellness Check-in',
        dueDate: '2026-09-18',
        status: 'Completed'
      }
    ],
    sessionHistory: [
      {
        id: `sess-${client.id}-1`,
        date: '2026-09-12',
        summary: `Clinical intake and personalized therapy objectives alignment with ${jayaConsName}.`,
        therapistNotes: 'Patient is engaged and receptive. Outlined therapeutic goals and assigned grounding homework.'
      }
    ],
    sessions: [
      {
        id: `sess-${client.id}-1`,
        date: '2026-09-12',
        service: 'Individual Therapy Session',
        status: 'COMPLETED',
        notes: 'Clinical intake session completed.'
      }
    ],
    totalSessionsCount: 2,
    completedSessionsCount: 1,
    attendanceRate: 100,
    activePlanName: 'Individual Therapy & Wellness Care',
    riskLevel: 'Low',
    emergencyContactName: 'Emergency Contact',
    emergencyContactPhone: '+91 98765 00000',
    joinedDate: '2026-09-14',
    lastSession: 'Sep 12, 2026',
    lastSessionDate: '2026-09-12',
    nextSession: `${client.bookingDate}, ${client.bookingTime}`,
    nextSessionDate: client.bookingDate,
    updatedAt: new Date()
  };

  // 1. Upsert into User and users collections
  await Promise.all([
    db.collection('User').updateOne(
      { email: client.email.toLowerCase().trim() },
      {
        $set: clientDoc,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    ),
    db.collection('users').updateOne(
      { email: client.email.toLowerCase().trim() },
      {
        $set: clientDoc,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )
  ]);
  console.log(`✅ [Client User Created/Updated] ${client.name} (${client.email}) assigned to ${jayaConsName}`);

  // 2. Upsert Confirmed Booking into Booking and bookings collections
  const bookingDoc = {
    _id: client.bookingId,
    id: client.bookingId,
    bookingId: `HEX-2026-${client.id.slice(-5)}`,
    clientId: client.id,
    userId: client.id,
    clientName: client.name,
    clientEmail: client.email.toLowerCase().trim(),
    clientPhone: client.phone,
    consultantId: jayaConsId,
    therapistId: jayaConsId,
    consultantName: jayaConsName,
    therapistName: jayaConsName,
    consultantEmail: jayaConsEmail,
    serviceId: 'srv-1789365864301',
    serviceTitle: '1 - 1 Individual Therapy Session',
    scheduledAt: client.scheduledAt,
    date: client.bookingDate,
    time: client.bookingTime,
    durationMinutes: 60,
    duration: 60,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    amount: 2000,
    meetingLink: `https://meet.google.com/hex-jaya-${client.id.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    notes: `Confirmed individual session with ${jayaConsName}.`,
    updatedAt: new Date()
  };

  await Promise.all([
    db.collection('Booking').updateOne(
      { id: client.bookingId },
      {
        $set: bookingDoc,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    ),
    db.collection('bookings').updateOne(
      { id: client.bookingId },
      {
        $set: bookingDoc,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )
  ]);
  console.log(`✅ [Confirmed Booking Created] ${client.bookingId} for ${client.name} with ${jayaConsName}`);

  // 3. Seed welcoming messages between Dr. Jayakumar and Jaswanth
  await db.collection('Message').deleteMany({
    $or: [
      { clientEmail: client.email.toLowerCase().trim(), consultantId: jayaConsId },
      { recipientEmail: client.email.toLowerCase().trim(), senderName: jayaConsName },
      { recipientEmail: jayaConsEmail, senderEmail: client.email.toLowerCase().trim() }
    ]
  });
  await db.collection('messages').deleteMany({
    $or: [
      { clientEmail: client.email.toLowerCase().trim(), consultantId: jayaConsId },
      { recipientEmail: client.email.toLowerCase().trim(), senderName: jayaConsName },
      { recipientEmail: jayaConsEmail, senderEmail: client.email.toLowerCase().trim() }
    ]
  }).catch(() => {});

  const msg1 = {
    id: `MSG-${Date.now()}-${client.id}-1`,
    senderRole: 'therapist',
    senderId: jayaConsId,
    senderName: jayaConsName,
    senderEmail: jayaConsEmail,
    recipientRole: 'client',
    recipientId: client.id,
    recipientName: client.name,
    recipientEmail: client.email.toLowerCase().trim(),
    consultantId: jayaConsId,
    consultantName: jayaConsName,
    consultantEmail: jayaConsEmail,
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email.toLowerCase().trim(),
    content: `Hello ${client.name}! I am ${jayaConsName}, your assigned consultant and therapist on Hexpertify. Welcome to your personalized care space. I have prepared your therapeutic plan and look forward to our confirmed session on ${client.bookingDate} at ${client.bookingTime}. Please feel free to message me anytime here!`,
    text: `Hello ${client.name}! I am ${jayaConsName}, your assigned consultant and therapist on Hexpertify. Welcome to your personalized care space. I have prepared your therapeutic plan and look forward to our confirmed session on ${client.bookingDate} at ${client.bookingTime}. Please feel free to message me anytime here!`,
    read: true,
    createdAt: new Date(Date.now() - 3600000 * 2),
    updatedAt: new Date(Date.now() - 3600000 * 2)
  };

  const msg2 = {
    id: `MSG-${Date.now()}-${client.id}-2`,
    senderRole: 'client',
    senderId: client.id,
    senderName: client.name,
    senderEmail: client.email.toLowerCase().trim(),
    recipientRole: 'therapist',
    recipientId: jayaConsId,
    recipientName: jayaConsName,
    recipientEmail: jayaConsEmail,
    consultantId: jayaConsId,
    consultantName: jayaConsName,
    consultantEmail: jayaConsEmail,
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email.toLowerCase().trim(),
    content: `Thank you Dr. Jayakumar! Looking forward to our consultation session and focusing on my goals.`,
    text: `Thank you Dr. Jayakumar! Looking forward to our consultation session and focusing on my goals.`,
    read: true,
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 3600000)
  };

  await Promise.all([
    db.collection('Message').insertMany([msg1, msg2]),
    db.collection('messages').insertMany([msg1, msg2]).catch(() => {})
  ]);
  console.log(`✅ [Direct Messages Seeded] Initial messages created between ${jayaConsName} and ${client.name}`);

  // 4. Update Dr. Jayakumar's assignedClientIds & activeClientsCount in Consultant collection
  await Promise.all([
    db.collection('Consultant').updateOne(
      { id: jayaConsId },
      {
        $addToSet: { assignedClientIds: client.id },
        $inc: { activeClientsCount: 1 },
        $set: { updatedAt: new Date() }
      }
    ),
    db.collection('consultants').updateOne(
      { id: jayaConsId },
      {
        $addToSet: { assignedClientIds: client.id },
        $inc: { activeClientsCount: 1 },
        $set: { updatedAt: new Date() }
      }
    ).catch(() => {})
  ]);
  console.log(`✅ [Consultant Client List Updated] Linked ${client.id} to ${jayaConsName}`);

  await closeDatabase();
  console.log('🎉 [Setup Complete] Jaswanth Jegan registered and assigned to Dr. Jayakumar successfully.');
}

seedJaswanth().catch(console.error);
