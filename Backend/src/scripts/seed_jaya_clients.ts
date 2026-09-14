import { connectToDatabase, closeDatabase } from '../db/mongodb';
import bcrypt from 'bcryptjs';

async function seedClientsAndAssignConsultant() {
  const db = await connectToDatabase();
  const hashedPassword = await bcrypt.hash('password123', 10);

  const jayaConsId = 'therapist-1789365881877';
  const jayaConsName = 'Dr. Jayakumar';
  const jayaConsEmail = 'zoya.milly01@gmail.com';
  const jayaConsPhoto = 'https://media.licdn.com/dms/image/v2/D5603AQFTS1Z73WIlCg/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1720859777245?e=2147483647&v=beta&t=yO7E_-3xylunJKT00b03-m9hTVuicUz6qszqtZVflqs';

  // 1. Ensure Dr. Jayakumar in Consultant & consultants collection has role & proper metadata
  await Promise.all([
    db.collection('Consultant').updateOne(
      { $or: [{ id: jayaConsId }, { email: jayaConsEmail }] },
      {
        $set: {
          id: jayaConsId,
          name: jayaConsName,
          email: jayaConsEmail,
          role: 'CONSULTANT',
          profession: 'Individual Therapy & Clinical Practitioner',
          specialization: 'Mental Health, Anxiety, Stress Management',
          photo: jayaConsPhoto,
          photoUrl: jayaConsPhoto,
          avatarUrl: jayaConsPhoto,
          image: jayaConsPhoto,
          password: hashedPassword,
          status: 'ACTIVE',
          accountStatus: 'Active',
          verificationStatus: 'Verified',
          updatedAt: new Date()
        }
      },
      { upsert: true }
    ),
    db.collection('consultants').updateOne(
      { $or: [{ id: jayaConsId }, { email: jayaConsEmail }] },
      {
        $set: {
          id: jayaConsId,
          name: jayaConsName,
          email: jayaConsEmail,
          role: 'CONSULTANT',
          profession: 'Individual Therapy & Clinical Practitioner',
          specialization: 'Mental Health, Anxiety, Stress Management',
          photo: jayaConsPhoto,
          photoUrl: jayaConsPhoto,
          avatarUrl: jayaConsPhoto,
          image: jayaConsPhoto,
          password: hashedPassword,
          status: 'ACTIVE',
          accountStatus: 'Active',
          verificationStatus: 'Verified',
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )
  ]);

  // Also in User / users collection for Dr. Jayakumar login
  await Promise.all([
    db.collection('User').updateOne(
      { email: jayaConsEmail },
      {
        $set: {
          id: jayaConsId,
          name: jayaConsName,
          email: jayaConsEmail,
          password: hashedPassword,
          role: 'CONSULTANT',
          profession: 'Individual Therapy & Clinical Practitioner',
          image: jayaConsPhoto,
          avatarUrl: jayaConsPhoto,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    ),
    db.collection('users').updateOne(
      { email: jayaConsEmail },
      {
        $set: {
          id: jayaConsId,
          name: jayaConsName,
          email: jayaConsEmail,
          password: hashedPassword,
          role: 'CONSULTANT',
          profession: 'Individual Therapy & Clinical Practitioner',
          image: jayaConsPhoto,
          avatarUrl: jayaConsPhoto,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )
  ]);
  console.log(`✅ [Consultant Verified] ${jayaConsName} (${jayaConsEmail}) verified in DB`);

  // 2. Define the two target clients
  const clients = [
    {
      id: 'USR-NOBODY-0707',
      name: 'Nobody',
      email: 'nobody07072001@gmail.com',
      phone: '+91 98765 07072',
      age: 24,
      gender: 'Male',
      preferredLanguage: 'English',
      image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      primaryGoal: 'Stress Management & Anxiety Reduction',
      bookingId: 'BK-NOBODY-001',
      bookingDate: '2026-09-18',
      bookingTime: '11:00 AM',
      scheduledAt: '2026-09-18T11:00:00.000Z'
    },
    {
      id: 'USR-8591',
      name: 'Janet Ulfiya',
      email: 'janetulfiya@dmice.ac.in',
      phone: '+91 98765 43210',
      age: 23,
      gender: 'Female',
      preferredLanguage: 'English',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      primaryGoal: 'Mindfulness & Emotional Balance',
      bookingId: 'BK-JANET-001',
      bookingDate: '2026-09-19',
      bookingTime: '02:00 PM',
      scheduledAt: '2026-09-19T14:00:00.000Z'
    }
  ];

  const clientIds: string[] = [];

  for (const client of clients) {
    clientIds.push(client.id);

    const clientDoc: any = {
      _id: client.id,
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
        `Achieve sustainable emotional regulation and progress in ${client.primaryGoal.toLowerCase()}`,
        'Engage in daily mindfulness and somatic grounding practice',
        'Maintain constructive thought logs and regular consultation check-ins'
      ],
      goals: [
        {
          id: `goal-${client.id}-1`,
          title: 'Daily Mindfulness & Grounding',
          targetDate: '2026-10-15',
          status: 'In Progress',
          progress: 70
        },
        {
          id: `goal-${client.id}-2`,
          title: 'CBT Thought Journaling Routine',
          targetDate: '2026-11-01',
          status: 'In Progress',
          progress: 55
        }
      ],
      aiIntakeSummary: `Client ${client.name} presented with primary focus on "${client.primaryGoal}". Displays proactive therapeutic motivation and strong engagement. Assigned to practitioner ${jayaConsName} for dedicated individual clinical therapy.`,
      intakeResponses: {
        'Presenting Concern': client.primaryGoal,
        'Duration of Symptoms': '1 to 3 months',
        'Previous Therapy Experience': 'Looking forward to initial guidance',
        'Daily Sleep Quality': 'Good, working on consistent sleep schedule',
        'Emergency Contact': `${client.name} Family Contact - +91 98765 00000`,
        'Preferred Session Time': 'Morning / Afternoon Slots'
      },
      assessmentScores: [
        {
          name: 'GAD-7 (Anxiety)',
          score: 5,
          maxScore: 21,
          date: '2026-09-14',
          severity: 'Mild'
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
        { date: '2026-09-10', score: 6 },
        { date: '2026-09-12', score: 7 },
        { date: '2026-09-13', score: 8 },
        { date: '2026-09-14', score: 8 }
      ],
      moodLogs: [
        {
          date: '2026-09-12',
          mood: 'Calm',
          score: 7,
          notes: 'Completed 10 minutes of diaphragmatic breathing exercises.'
        },
        {
          date: '2026-09-14',
          mood: 'Optimistic',
          score: 8,
          notes: 'Feeling motivated for upcoming consultation with Dr. Jayakumar.'
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
          summary: `Introductory consultation and personalized care plan structuring with ${jayaConsName}.`,
          therapistNotes: 'Patient is engaged and receptive. Outlined therapeutic goals and assigned grounding homework.'
        }
      ],
      sessions: [
        {
          id: `sess-${client.id}-1`,
          date: '2026-09-12',
          service: 'Individual Therapy Session',
          status: 'COMPLETED',
          notes: 'Introductory consultation completed.'
        }
      ],
      totalSessionsCount: 2,
      completedSessionsCount: 1,
      attendanceRate: 100,
      activePlanName: 'Individual Therapy & Wellness Care',
      riskLevel: 'Low',
      emergencyContactName: 'Family Contact',
      emergencyContactPhone: '+91 98765 00000',
      joinedDate: '2026-09-14',
      lastSession: 'Sep 12, 2026',
      lastSessionDate: '2026-09-12',
      nextSession: `${client.bookingDate}, ${client.bookingTime}`,
      nextSessionDate: client.bookingDate,
      updatedAt: new Date()
    };

    // Upsert into User and users collections
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

    // Upsert Confirmed Booking into Booking and bookings collections
    const bookingDoc = {
      _id: client.bookingId,
      id: client.bookingId,
      bookingId: `HEX-2026-${client.id.slice(-4)}`,
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

    // Seed welcoming messages between Dr. Jayakumar and client
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
      content: `Thank you Dr. Jayakumar! I am looking forward to our upcoming session and working together on my goals.`,
      text: `Thank you Dr. Jayakumar! I am looking forward to our upcoming session and working together on my goals.`,
      read: true,
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(Date.now() - 3600000)
    };

    await Promise.all([
      db.collection('Message').insertMany([msg1, msg2]),
      db.collection('messages').insertMany([msg1, msg2]).catch(() => {})
    ]);
    console.log(`✅ [Direct Messages Seeded] Initial messages created between ${jayaConsName} and ${client.name}`);
  }

  // 3. Update Dr. Jayakumar's assignedClientIds & activeClientsCount in Consultant collection
  await Promise.all([
    db.collection('Consultant').updateOne(
      { id: jayaConsId },
      {
        $addToSet: { assignedClientIds: { $each: clientIds } },
        $set: { activeClientsCount: clientIds.length, updatedAt: new Date() }
      }
    ),
    db.collection('consultants').updateOne(
      { id: jayaConsId },
      {
        $addToSet: { assignedClientIds: { $each: clientIds } },
        $set: { activeClientsCount: clientIds.length, updatedAt: new Date() }
      }
    ).catch(() => {})
  ]);
  console.log(`✅ [Consultant Client List Updated] Assigned clients [${clientIds.join(', ')}] linked to ${jayaConsName}`);

  await closeDatabase();
  console.log('🎉 [Setup Complete] Both clients registered and assigned to Jaya Kumar successfully.');
}

seedClientsAndAssignConsultant().catch(console.error);
