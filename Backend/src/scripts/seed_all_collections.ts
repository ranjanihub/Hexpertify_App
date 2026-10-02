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
    "id": "ACT-01",
    "_id": "ACT-01",
    "name": "Diaphragmatic Breathing",
    "title": "Diaphragmatic Breathing",
    "categoryTag": "BREATHING",
    "category": "BREATHING",
    "duration": "5-10 minutes",
    "difficulty": "Easy",
    "repeat": "Daily",
    "frequency": "Daily",
    "timeOfDay": "Morning (8:00 AM)",
    "dueDate": "Today",
    "description": "Deep belly breathing technique to reduce stress and anxiety naturally.",
    "howItHelps": "Deep belly breathing technique to reduce stress and anxiety naturally.",
    "benefits": [
      "Reduces Stress",
      "Improves Focus",
      "Enhances Relaxation"
    ],
    "imageUrl": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
    "filePath": "src/activities/templates/MoodLiftActivity.tsx",
    "templateId": "ACT-01",
    "assignedClientName": "Sarah Jenkins",
    "assignedTherapistName": "Dr. Alex Harrison",
    "assignedInfo": "Sarah Jenkins • Daily",
    "assignedTo": [
      "Sarah Jenkins"
    ],
    "clientAssignments": [
      {
        "clientName": "Sarah Jenkins",
        "frequency": "Daily",
        "timeOfDay": "Morning (8:00 AM)"
      }
    ],
    "isVisible": true,
    "instructions": "Deep belly breathing technique to reduce stress and anxiety naturally.\n\nClinical Benefits:\n• Reduces Stress\n• Improves Focus\n• Enhances Relaxation",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
  },
  {
    "id": "ACT-02",
    "_id": "ACT-02",
    "name": "Box Breathing",
    "title": "Box Breathing",
    "categoryTag": "BREATHING",
    "category": "BREATHING",
    "duration": "4-8 minutes",
    "difficulty": "Easy",
    "repeat": "2-3 Times / Week",
    "frequency": "2-3 Times / Week",
    "timeOfDay": "Evening (7:00 PM)",
    "dueDate": "Today",
    "description": "Navy SEAL breathing technique for staying calm under pressure with 4-4-4-4 pattern.",
    "howItHelps": "Navy SEAL breathing technique for staying calm under pressure with 4-4-4-4 pattern.",
    "benefits": [
      "Calms Mind",
      "Reduces Anxiety",
      "Improves Concentration"
    ],
    "imageUrl": "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80",
    "filePath": "src/activities/templates/MoodLiftActivity.tsx",
    "templateId": "ACT-02",
    "assignedClientName": "Emily Rodriguez",
    "assignedTherapistName": "Dr. Elena Rostova",
    "assignedInfo": "Emily Rodriguez • 2-3 Times / Week",
    "assignedTo": [
      "Emily Rodriguez"
    ],
    "clientAssignments": [
      {
        "clientName": "Emily Rodriguez",
        "frequency": "2-3 Times / Week",
        "timeOfDay": "Morning (8:00 AM)"
      }
    ],
    "isVisible": true,
    "instructions": "Navy SEAL breathing technique for staying calm under pressure with 4-4-4-4 pattern.\n\nClinical Benefits:\n• Calms Mind\n• Reduces Anxiety\n• Improves Concentration",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
  },
  {
    "id": "ACT-03",
    "_id": "ACT-03",
    "name": "4-7-8 Breathing",
    "title": "4-7-8 Breathing",
    "categoryTag": "BREATHING",
    "category": "BREATHING",
    "duration": "2-3 minutes",
    "difficulty": "Easy",
    "repeat": "As Needed",
    "frequency": "As Needed (PRN)",
    "timeOfDay": "Afternoon (1:00 PM)",
    "dueDate": "Today",
    "description": "The famous 4-7-8 breathing technique popularized by Dr. Andrew Weil is a simple yet powerful method for anxiety relief and better sleep. By following the pattern of inhale for 4 seconds, hold for 7 seconds, and exhale for 8 seconds, you activate your parasympathetic nervous system and experience deep relaxation.",
    "howItHelps": "The famous 4-7-8 breathing technique popularized by Dr. Andrew Weil is a simple yet powerful method for anxiety relief and better sleep. By following the pattern of inhale for 4 seconds, hold for 7 seconds, and exhale for 8 seconds, you activate your parasympathetic nervous system and experience deep relaxation.",
    "benefits": [
      "Promotes Better Sleep",
      "Reduces Anxiety",
      "Calms the Nervous System"
    ],
    "imageUrl": "https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=800&q=80",
    "filePath": "src/activities/templates/MoodLiftActivity.tsx",
    "templateId": "ACT-03",
    "assignedClientName": "Amanda Miller",
    "assignedTherapistName": "Marcus Vance",
    "assignedInfo": "Amanda Miller • As Needed",
    "assignedTo": [
      "Amanda Miller"
    ],
    "clientAssignments": [
      {
        "clientName": "Amanda Miller",
        "frequency": "2-3 Times / Week",
        "timeOfDay": "Morning (8:00 AM)"
      }
    ],
    "isVisible": true,
    "instructions": "The famous 4-7-8 breathing technique popularized by Dr. Andrew Weil is a simple yet powerful method for anxiety relief and better sleep. By following the pattern of inhale for 4 seconds, hold for 7 seconds, and exhale for 8 seconds, you activate your parasympathetic nervous system and experience deep relaxation.\n\nClinical Benefits:\n• Promotes Better Sleep\n• Reduces Anxiety\n• Calms the Nervous System",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
  },
  {
    "id": "ACT-04",
    "_id": "ACT-04",
    "name": "Alternate Nostril Breathing",
    "title": "Alternate Nostril Breathing",
    "categoryTag": "BREATHING",
    "category": "BREATHING",
    "duration": "5-10 minutes",
    "difficulty": "Easy",
    "repeat": "Daily",
    "frequency": "Daily",
    "timeOfDay": "Any Time",
    "dueDate": "Today",
    "description": "This ancient yogic breathing technique alternates airflow between nostrils to balance the left and right brain hemispheres. By harmonizing your nervous system, it reduces stress, improves focus, and creates a profound sense of calm and mental clarity.",
    "howItHelps": "This ancient yogic breathing technique alternates airflow between nostrils to balance the left and right brain hemispheres. By harmonizing your nervous system, it reduces stress, improves focus, and creates a profound sense of calm and mental clarity.",
    "benefits": [
      "Balances Brain Hemispheres",
      "Promotes Deep Relaxation",
      "Enhances Mental Clarity"
    ],
    "imageUrl": "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80",
    "filePath": "src/activities/templates/MoodLiftActivity.tsx",
    "templateId": "ACT-04",
    "assignedClientName": "Robert Garcia",
    "assignedTherapistName": "Dr. Sophia Bennett",
    "assignedInfo": "Robert Garcia • Daily",
    "assignedTo": [
      "Robert Garcia"
    ],
    "clientAssignments": [
      {
        "clientName": "Robert Garcia",
        "frequency": "Daily",
        "timeOfDay": "Morning (8:00 AM)"
      }
    ],
    "isVisible": true,
    "instructions": "This ancient yogic breathing technique alternates airflow between nostrils to balance the left and right brain hemispheres. By harmonizing your nervous system, it reduces stress, improves focus, and creates a profound sense of calm and mental clarity.\n\nClinical Benefits:\n• Balances Brain Hemispheres\n• Promotes Deep Relaxation\n• Enhances Mental Clarity",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
  },
  {
    "id": "ACT-05",
    "_id": "ACT-05",
    "name": "Describe Your Room",
    "title": "Describe Your Room",
    "categoryTag": "MINDFULNESS",
    "category": "MINDFULNESS",
    "duration": "1-2 minutes",
    "difficulty": "Easy",
    "repeat": "2-3 Times / Week",
    "frequency": "2-3 Times / Week",
    "timeOfDay": "Morning (8:00 AM)",
    "dueDate": "Today",
    "description": "Use mindfulness to anchor yourself in the present moment by describing your surroundings in detail. This grounding technique helps redirect anxious thoughts and brings you into the here-and-now through sensory awareness.",
    "howItHelps": "Use mindfulness to anchor yourself in the present moment by describing your surroundings in detail. This grounding technique helps redirect anxious thoughts and brings you into the here-and-now through sensory awareness.",
    "benefits": [
      "Improves Presence",
      "Grounds in Reality",
      "Enhances Sensory Awareness"
    ],
    "imageUrl": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    "filePath": "src/activities/templates/MoodLiftActivity.tsx",
    "templateId": "ACT-05",
    "assignedClientName": "Michael Chen",
    "assignedTherapistName": "Dr. Alex Harrison",
    "assignedInfo": "Michael Chen • 2-3 Times / Week",
    "assignedTo": [
      "Michael Chen"
    ],
    "clientAssignments": [
      {
        "clientName": "Michael Chen",
        "frequency": "2-3 Times / Week",
        "timeOfDay": "Morning (8:00 AM)"
      }
    ],
    "isVisible": true,
    "instructions": "Use mindfulness to anchor yourself in the present moment by describing your surroundings in detail. This grounding technique helps redirect anxious thoughts and brings you into the here-and-now through sensory awareness.\n\nClinical Benefits:\n• Improves Presence\n• Grounds in Reality\n• Enhances Sensory Awareness",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
  },
  {
    "id": "ACT-06",
    "_id": "ACT-06",
    "name": "Name the Moment",
    "title": "Name the Moment",
    "categoryTag": "MINDFULNESS",
    "category": "MINDFULNESS",
    "duration": "2-3 minutes",
    "difficulty": "Easy",
    "repeat": "As Needed",
    "frequency": "As Needed (PRN)",
    "timeOfDay": "Evening (7:00 PM)",
    "dueDate": "Today",
    "description": "This guided self-reassurance exercise helps you acknowledge difficult emotions with kindness and compassion. By speaking affirmations and reassurances to yourself, you rewire your nervous system to respond to stress with self-support instead of self-criticism, building lasting emotional resilience.",
    "howItHelps": "This guided self-reassurance exercise helps you acknowledge difficult emotions with kindness and compassion. By speaking affirmations and reassurances to yourself, you rewire your nervous system to respond to stress with self-support instead of self-criticism, building lasting emotional resilience.",
    "benefits": [
      "Builds Self-Compassion",
      "Reduces Emotional Overwhelm",
      "Strengthens Inner Resilience"
    ],
    "imageUrl": "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=800&q=80",
    "filePath": "src/activities/templates/MoodLiftActivity.tsx",
    "templateId": "ACT-06",
    "assignedClientName": "David Kim",
    "assignedTherapistName": "Dr. Evelyn Reed",
    "assignedInfo": "David Kim • As Needed",
    "assignedTo": [
      "David Kim"
    ],
    "clientAssignments": [
      {
        "clientName": "David Kim",
        "frequency": "2-3 Times / Week",
        "timeOfDay": "Morning (8:00 AM)"
      }
    ],
    "isVisible": true,
    "instructions": "This guided self-reassurance exercise helps you acknowledge difficult emotions with kindness and compassion. By speaking affirmations and reassurances to yourself, you rewire your nervous system to respond to stress with self-support instead of self-criticism, building lasting emotional resilience.\n\nClinical Benefits:\n• Builds Self-Compassion\n• Reduces Emotional Overwhelm\n• Strengthens Inner Resilience",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
  },
  {
    "id": "ACT-07",
    "_id": "ACT-07",
    "name": "Physical Grounding",
    "title": "Physical Grounding",
    "categoryTag": "SOMATIC",
    "category": "SOMATIC",
    "duration": "5-10 minutes",
    "difficulty": "Easy",
    "repeat": "Daily",
    "frequency": "Daily",
    "timeOfDay": "Afternoon (1:00 PM)",
    "dueDate": "Today",
    "description": "Engage your five senses through tactile and physical experiences to bring you fully into the present moment. This somatic grounding technique interrupts the stress response cycle by signaling to your nervous system that you are safe, helping you move out of fight-or-flight mode into calm awareness.",
    "howItHelps": "Engage your five senses through tactile and physical experiences to bring you fully into the present moment. This somatic grounding technique interrupts the stress response cycle by signaling to your nervous system that you are safe, helping you move out of fight-or-flight mode into calm awareness.",
    "benefits": [
      "Anchors You in Your Body",
      "Releases Trauma Responses",
      "Activates Safety Signals"
    ],
    "imageUrl": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
    "filePath": "src/activities/templates/MoodLiftActivity.tsx",
    "templateId": "ACT-07",
    "assignedClientName": "Rohan Mehta",
    "assignedTherapistName": "Dr. Aravind Swamy",
    "assignedInfo": "Rohan Mehta • Daily",
    "assignedTo": [
      "Rohan Mehta"
    ],
    "clientAssignments": [
      {
        "clientName": "Rohan Mehta",
        "frequency": "Daily",
        "timeOfDay": "Morning (8:00 AM)"
      }
    ],
    "isVisible": true,
    "instructions": "Engage your five senses through tactile and physical experiences to bring you fully into the present moment. This somatic grounding technique interrupts the stress response cycle by signaling to your nervous system that you are safe, helping you move out of fight-or-flight mode into calm awareness.\n\nClinical Benefits:\n• Anchors You in Your Body\n• Releases Trauma Responses\n• Activates Safety Signals",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
  },
  {
    "id": "ACT-08",
    "_id": "ACT-08",
    "name": "Posture Reset",
    "title": "Posture Reset",
    "categoryTag": "SOMATIC",
    "category": "SOMATIC",
    "duration": "1-1.5 minutes",
    "difficulty": "Easy",
    "repeat": "2-3 Times / Week",
    "frequency": "2-3 Times / Week",
    "timeOfDay": "Any Time",
    "dueDate": "Today",
    "description": "Your body and mind are deeply connected. By intentionally adjusting your posture and releasing tension through gentle movements, you signal to your nervous system that you are safe and grounded. This practice helps you reclaim your physical presence and mental clarity.",
    "howItHelps": "Your body and mind are deeply connected. By intentionally adjusting your posture and releasing tension through gentle movements, you signal to your nervous system that you are safe and grounded. This practice helps you reclaim your physical presence and mental clarity.",
    "benefits": [
      "Releases Physical Tension",
      "Improves Body Awareness",
      "Restores Natural Alignment"
    ],
    "imageUrl": "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?auto=format&fit=crop&w=800&q=80",
    "filePath": "src/activities/templates/MoodLiftActivity.tsx",
    "templateId": "ACT-08",
    "assignedClientName": "Kavita Krishnan",
    "assignedTherapistName": "Dr. Priya Sharma",
    "assignedInfo": "Kavita Krishnan • 2-3 Times / Week",
    "assignedTo": [
      "Kavita Krishnan"
    ],
    "clientAssignments": [
      {
        "clientName": "Kavita Krishnan",
        "frequency": "2-3 Times / Week",
        "timeOfDay": "Morning (8:00 AM)"
      }
    ],
    "isVisible": true,
    "instructions": "Your body and mind are deeply connected. By intentionally adjusting your posture and releasing tension through gentle movements, you signal to your nervous system that you are safe and grounded. This practice helps you reclaim your physical presence and mental clarity.\n\nClinical Benefits:\n• Releases Physical Tension\n• Improves Body Awareness\n• Restores Natural Alignment",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
  },
  {
    "id": "ACT-09",
    "_id": "ACT-09",
    "name": "Self-Soothing",
    "title": "Self-Soothing",
    "categoryTag": "SOMATIC",
    "category": "SOMATIC",
    "duration": "5-10 minutes",
    "difficulty": "Easy",
    "repeat": "As Needed",
    "frequency": "As Needed (PRN)",
    "timeOfDay": "Morning (8:00 AM)",
    "dueDate": "Today",
    "description": "Drawing from Dialectical Behavior Therapy (DBT), this technique teaches you to soothe yourself through multisensory engagement. By intentionally activating your senses—touch, smell, taste, sight, sound—you create a safe container for emotional pain and build your capacity to tolerate distressing moments.",
    "howItHelps": "Drawing from Dialectical Behavior Therapy (DBT), this technique teaches you to soothe yourself through multisensory engagement. By intentionally activating your senses—touch, smell, taste, sight, sound—you create a safe container for emotional pain and build your capacity to tolerate distressing moments.",
    "benefits": [
      "Soothes Emotional Pain",
      "Provides Immediate Relief",
      "Builds Distress Tolerance"
    ],
    "imageUrl": "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80",
    "filePath": "src/activities/templates/MoodLiftActivity.tsx",
    "templateId": "ACT-09",
    "assignedClientName": "Siddharth Verma",
    "assignedTherapistName": "Dr. David Chen",
    "assignedInfo": "Siddharth Verma • As Needed",
    "assignedTo": [
      "Siddharth Verma"
    ],
    "clientAssignments": [
      {
        "clientName": "Siddharth Verma",
        "frequency": "2-3 Times / Week",
        "timeOfDay": "Morning (8:00 AM)"
      }
    ],
    "isVisible": true,
    "instructions": "Drawing from Dialectical Behavior Therapy (DBT), this technique teaches you to soothe yourself through multisensory engagement. By intentionally activating your senses—touch, smell, taste, sight, sound—you create a safe container for emotional pain and build your capacity to tolerate distressing moments.\n\nClinical Benefits:\n• Soothes Emotional Pain\n• Provides Immediate Relief\n• Builds Distress Tolerance",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
  },
  {
    "id": "ACT-10",
    "_id": "ACT-10",
    "name": "CBT Thought-Challenger",
    "title": "CBT Thought-Challenger",
    "categoryTag": "CBT",
    "category": "CBT",
    "duration": "10-15 minutes",
    "difficulty": "Medium",
    "repeat": "Daily",
    "frequency": "Daily",
    "timeOfDay": "Evening (7:00 PM)",
    "dueDate": "Today",
    "description": "Using Cognitive Behavioral Therapy techniques, challenge automatic negative thoughts by examining the evidence for and against them. Develop balanced, realistic perspectives that reduce anxiety, low mood, and self-criticism through cognitive restructuring.",
    "howItHelps": "Using Cognitive Behavioral Therapy techniques, challenge automatic negative thoughts by examining the evidence for and against them. Develop balanced, realistic perspectives that reduce anxiety, low mood, and self-criticism through cognitive restructuring.",
    "benefits": [
      "Challenges Negative Thinking",
      "Reduces Anxiety",
      "Builds Emotional Resilience"
    ],
    "imageUrl": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80",
    "filePath": "src/activities/templates/MoodLiftActivity.tsx",
    "templateId": "ACT-10",
    "assignedClientName": "Alex Morgan",
    "assignedTherapistName": "Dr. Elena Rostova",
    "assignedInfo": "Alex Morgan • Daily",
    "assignedTo": [
      "Alex Morgan"
    ],
    "clientAssignments": [
      {
        "clientName": "Alex Morgan",
        "frequency": "Daily",
        "timeOfDay": "Morning (8:00 AM)"
      }
    ],
    "isVisible": true,
    "instructions": "Using Cognitive Behavioral Therapy techniques, challenge automatic negative thoughts by examining the evidence for and against them. Develop balanced, realistic perspectives that reduce anxiety, low mood, and self-criticism through cognitive restructuring.\n\nClinical Benefits:\n• Challenges Negative Thinking\n• Reduces Anxiety\n• Builds Emotional Resilience",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
  },
  {
    "id": "ACT-11",
    "_id": "ACT-11",
    "name": "Affirmation Mirror",
    "title": "Affirmation Mirror",
    "categoryTag": "GRATITUDE",
    "category": "GRATITUDE",
    "duration": "5-10 minutes",
    "difficulty": "Easy",
    "repeat": "2-3 Times / Week",
    "frequency": "2-3 Times / Week",
    "timeOfDay": "Afternoon (1:00 PM)",
    "dueDate": "Today",
    "description": "Transform negative self-talk into powerful, personalized affirmations that rewire your brain toward self-compassion. By mirroring empowering statements back to yourself, you create new neural pathways that support lasting confidence, resilience, and emotional wellbeing.",
    "howItHelps": "Transform negative self-talk into powerful, personalized affirmations that rewire your brain toward self-compassion. By mirroring empowering statements back to yourself, you create new neural pathways that support lasting confidence, resilience, and emotional wellbeing.",
    "benefits": [
      "Boosts Self-Esteem",
      "Builds Self-Compassion",
      "Reduces Negative Self-Talk"
    ],
    "imageUrl": "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    "filePath": "src/activities/templates/MoodLiftActivity.tsx",
    "templateId": "ACT-11",
    "assignedClientName": "Sarah Jenkins",
    "assignedTherapistName": "Marcus Vance",
    "assignedInfo": "Sarah Jenkins • 2-3 Times / Week",
    "assignedTo": [
      "Sarah Jenkins"
    ],
    "clientAssignments": [
      {
        "clientName": "Sarah Jenkins",
        "frequency": "2-3 Times / Week",
        "timeOfDay": "Morning (8:00 AM)"
      }
    ],
    "isVisible": true,
    "instructions": "Transform negative self-talk into powerful, personalized affirmations that rewire your brain toward self-compassion. By mirroring empowering statements back to yourself, you create new neural pathways that support lasting confidence, resilience, and emotional wellbeing.\n\nClinical Benefits:\n• Boosts Self-Esteem\n• Builds Self-Compassion\n• Reduces Negative Self-Talk",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
  },
  {
    "id": "ACT-12",
    "_id": "ACT-12",
    "name": "Worry Box",
    "title": "Worry Box",
    "categoryTag": "CBT",
    "category": "CBT",
    "duration": "3-5 minutes",
    "difficulty": "Easy",
    "repeat": "As Needed",
    "frequency": "As Needed (PRN)",
    "timeOfDay": "Any Time",
    "dueDate": "Today",
    "description": "Externalize your worries by placing them somewhere safe—outside your mind. This CBT-based technique helps your brain interpret the worry as \"stored and contained,\" reducing its emotional intensity. When worries feel infinite in your head, simply writing them down and placing them away creates essential psychological distance.",
    "howItHelps": "Externalize your worries by placing them somewhere safe—outside your mind. This CBT-based technique helps your brain interpret the worry as \"stored and contained,\" reducing its emotional intensity. When worries feel infinite in your head, simply writing them down and placing them away creates essential psychological distance.",
    "benefits": [
      "Reduces Mental Clutter",
      "Prevents Rumination",
      "Increases Emotional Control"
    ],
    "imageUrl": "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=800&q=80",
    "filePath": "src/activities/templates/MoodLiftActivity.tsx",
    "templateId": "ACT-12",
    "assignedClientName": "Emily Rodriguez",
    "assignedTherapistName": "Dr. Sophia Bennett",
    "assignedInfo": "Emily Rodriguez • As Needed",
    "assignedTo": [
      "Emily Rodriguez"
    ],
    "clientAssignments": [
      {
        "clientName": "Emily Rodriguez",
        "frequency": "2-3 Times / Week",
        "timeOfDay": "Morning (8:00 AM)"
      }
    ],
    "isVisible": true,
    "instructions": "Externalize your worries by placing them somewhere safe—outside your mind. This CBT-based technique helps your brain interpret the worry as \"stored and contained,\" reducing its emotional intensity. When worries feel infinite in your head, simply writing them down and placing them away creates essential psychological distance.\n\nClinical Benefits:\n• Reduces Mental Clutter\n• Prevents Rumination\n• Increases Emotional Control",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
  },
  {
    "id": "ACT-13",
    "_id": "ACT-13",
    "name": "Cognitive Grounding",
    "title": "Cognitive Grounding",
    "categoryTag": "MINDFULNESS",
    "category": "MINDFULNESS",
    "duration": "5-10 minutes",
    "difficulty": "Easy",
    "repeat": "Daily",
    "frequency": "Daily",
    "timeOfDay": "Morning (8:00 AM)",
    "dueDate": "Today",
    "description": "Engage your mind with focused mental exercises like counting, naming, and sensory grounding to shift attention away from worry and anchor you in the present.",
    "howItHelps": "Engage your mind with focused mental exercises like counting, naming, and sensory grounding to shift attention away from worry and anchor you in the present.",
    "benefits": [
      "Interrupts Anxiety",
      "Sharpens Focus",
      "Grounds in Present"
    ],
    "imageUrl": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    "filePath": "src/activities/templates/MoodLiftActivity.tsx",
    "templateId": "ACT-13",
    "assignedClientName": "Amanda Miller",
    "assignedTherapistName": "Dr. Alex Harrison",
    "assignedInfo": "Amanda Miller • Daily",
    "assignedTo": [
      "Amanda Miller"
    ],
    "clientAssignments": [
      {
        "clientName": "Amanda Miller",
        "frequency": "Daily",
        "timeOfDay": "Morning (8:00 AM)"
      }
    ],
    "isVisible": true,
    "instructions": "Engage your mind with focused mental exercises like counting, naming, and sensory grounding to shift attention away from worry and anchor you in the present.\n\nClinical Benefits:\n• Interrupts Anxiety\n• Sharpens Focus\n• Grounds in Present",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
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
  // 7. REAL-TIME MESSAGES (`Message` / `messages`)
  console.log('💬 Initializing Messages collection...');
  await db.collection('Message').deleteMany({
    $or: [
      { content: { $regex: /looking forward to our upcoming/i } },
      { content: { $regex: /grounding exercise has been really helpful/i } },
      { content: { $regex: /welcome to your personalized care portal/i } }
    ]
  });
  await db.collection('messages').deleteMany({
    $or: [
      { content: { $regex: /looking forward to our upcoming/i } },
      { content: { $regex: /grounding exercise has been really helpful/i } },
      { content: { $regex: /welcome to your personalized care portal/i } }
    ]
  });
  console.log(`✅ [Messages Ready] Genuine messages preserved, mock greetings cleared.`);

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
