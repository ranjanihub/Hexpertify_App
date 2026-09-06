import { connectToDatabase, closeDatabase } from '../db/mongodb';
import bcrypt from 'bcryptjs';

async function run() {
  const db = await connectToDatabase();

  const dummyTherapistId = 'consultant-marcus';
  const dummyTherapistName = 'Dr. Marcus Vance';
  const dummyTherapistEmail = 'marcus.vance@hexpertify.com';
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Upsert Dummy Therapist in Consultant collection
  await db.collection('Consultant').updateOne(
    { $or: [{ id: dummyTherapistId }, { email: dummyTherapistEmail }] },
    {
      $set: {
        id: dummyTherapistId,
        name: dummyTherapistName,
        email: dummyTherapistEmail,
        role: 'CONSULTANT',
        profession: 'Senior Clinical Psychologist (CBT & Mindfulness)',
        specialization: 'Cognitive Behavioral Therapy, Panic & Generalized Anxiety',
        image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
        rating: 4.96,
        reviewCount: 42,
        experience: '8 Years',
        hourlyRate: 1500,
        bio: 'Compassionate licensed clinical psychologist specializing in evidence-based CBT, somatic nervous system regulation, and mindfulness therapies.',
        availability: {
          Monday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
          Tuesday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
          Wednesday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
          Thursday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
          Friday: ['09:00', '10:00', '11:00', '14:00', '15:00'],
          Saturday: ['10:00', '11:00', '12:00'],
          Sunday: []
        },
        status: 'ACTIVE',
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  // Also in User collection
  await db.collection('User').updateOne(
    { email: dummyTherapistEmail },
    {
      $set: {
        id: dummyTherapistId,
        name: dummyTherapistName,
        email: dummyTherapistEmail,
        password: hashedPassword,
        role: 'CONSULTANT',
        profession: 'Senior Clinical Psychologist',
        image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  console.log(`✅ [Therapist Created] ${dummyTherapistName} (${dummyTherapistEmail})`);

  // 2. Upsert Client ranjaniranjani5694@gmail.com and assign to Dr. Marcus Vance
  const clientEmail = 'ranjaniranjani5694@gmail.com';
  const clientId = 'client-ranjani-test';
  const clientName = 'Ranjani B';

  await db.collection('User').updateOne(
    { email: clientEmail },
    {
      $set: {
        id: clientId,
        name: clientName,
        email: clientEmail,
        password: hashedPassword,
        role: 'CLIENT',
        phoneNumber: '+91 98765 43210',
        emailVerified: true,
        assignedTherapistId: dummyTherapistId,
        assignedTherapistName: dummyTherapistName,
        assignedTherapistEmail: dummyTherapistEmail,
        primaryGoal: 'Anxiety Management & Stress Regulation',
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  console.log(`✅ [Client Assigned] ${clientName} (${clientEmail}) assigned to ${dummyTherapistName}`);

  // 3. Create Confirmed Booking between Ranjani and Dr. Marcus Vance
  const bookingId = 'BK-MARCUS-001';
  await db.collection('Booking').updateOne(
    { id: bookingId },
    {
      $set: {
        id: bookingId,
        clientId,
        clientName,
        clientEmail,
        consultantId: dummyTherapistId,
        consultantName: dummyTherapistName,
        serviceTitle: 'Individual Clinical Psychology Consultation',
        scheduledAt: '2026-09-03T10:00:00Z',
        date: '2026-09-03',
        time: '10:00 AM',
        durationMinutes: 50,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        amount: 1500,
        meetingLink: 'https://meet.google.com/hex-marcus-ranjani',
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  // Sync to bookings collection
  await db.collection('bookings').updateOne(
    { id: bookingId },
    {
      $set: {
        id: bookingId,
        clientId,
        clientName,
        clientEmail,
        consultantId: dummyTherapistId,
        consultantName: dummyTherapistName,
        serviceTitle: 'Individual Clinical Psychology Consultation',
        scheduledAt: '2026-09-03T10:00:00Z',
        date: '2026-09-03',
        time: '10:00 AM',
        durationMinutes: 50,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        amount: 1500,
        meetingLink: 'https://meet.google.com/hex-marcus-ranjani',
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  console.log(`✅ [Booking Created] Booking ${bookingId} created between ${clientName} and ${dummyTherapistName}`);

  // 4. Create Initial Conversation Messages in Message collection
  await db.collection('Message').deleteMany({
    $or: [
      { consultantId: dummyTherapistId, clientEmail },
      { recipientEmail: clientEmail, senderName: dummyTherapistName }
    ]
  });

  const msg1 = {
    id: `MSG-${Date.now()}-1`,
    senderRole: 'therapist',
    senderName: dummyTherapistName,
    senderEmail: dummyTherapistEmail,
    recipientRole: 'client',
    recipientName: clientName,
    recipientEmail: clientEmail,
    consultantId: dummyTherapistId,
    consultantName: dummyTherapistName,
    clientId,
    clientName,
    clientEmail,
    content: `Hello ${clientName}! I am Dr. Marcus Vance, your assigned clinical psychologist. Looking forward to our upcoming consultation session on Sept 3rd at 10:00 AM. Let me know if there are specific concerns you'd like us to focus on.`,
    read: true,
    createdAt: new Date(Date.now() - 3600000 * 3),
    updatedAt: new Date(Date.now() - 3600000 * 3)
  };

  const msg2 = {
    id: `MSG-${Date.now()}-2`,
    senderRole: 'client',
    senderName: clientName,
    senderEmail: clientEmail,
    recipientRole: 'therapist',
    recipientName: dummyTherapistName,
    recipientEmail: dummyTherapistEmail,
    consultantId: dummyTherapistId,
    consultantName: dummyTherapistName,
    clientId,
    clientName,
    clientEmail,
    content: `Hello Dr. Marcus, thank you! I've been experiencing workplace stress and looking for coping strategies. Looking forward to our session!`,
    read: true,
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 3600000)
  };

  await db.collection('Message').insertMany([msg1, msg2]);
  console.log(`✅ [Messages Seeded] 2 initial messages added between ${dummyTherapistName} and ${clientName}`);

  await closeDatabase();
  console.log('🎉 [Done] Setup completed successfully.');
}

run().catch(console.error);
