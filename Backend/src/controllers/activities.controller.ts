import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

const DEFAULT_SEED_ACTIVITIES = [
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

import { cacheService } from '../services/cache.service';

export class ActivitiesController {
  /**
   * GET /api/activities and GET /api/admin/activities
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const isAdmin =
        req.path.includes('admin') ||
        req.baseUrl.includes('admin') ||
        req.query.role === 'ADMIN' ||
        req.query.isAdmin === 'true';

      const cacheKey = isAdmin ? 'activities:admin' : 'activities:public';

      const responseData = await cacheService.wrap(cacheKey, ['activities'], 30, async () => {
        const db = getDatabase();
        let activities = await db.collection('Activity').find({}).toArray();

        if (activities.length === 0) {
          // Auto-seed default clinical activities in MongoDB Atlas
          await db.collection('Activity').insertMany(DEFAULT_SEED_ACTIVITIES).catch(() => {});
          activities = await db.collection('Activity').find({}).toArray();
        }

        // Filter for non-admin viewers (consultants and clients only see activities approved/visible by admin)
        const filtered = isAdmin
          ? activities
          : activities.filter((a) => a.isVisible !== false);

        return {
          success: true,
          count: filtered.length,
          activities: filtered.map((a) => ({
            ...a,
            id: a.id || String(a._id),
            title: a.title || a.name || 'Therapeutic Activity',
            name: a.name || a.title || 'Therapeutic Activity',
            category: (a.categoryTag || a.category || 'MINDFULNESS').toUpperCase(),
            categoryTag: (a.categoryTag || a.category || 'MINDFULNESS').toUpperCase(),
            isVisible: a.isVisible !== undefined ? a.isVisible : true
          }))
        };
      });

      res.json(responseData);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch activities' });
    }
  }

  /**
   * GET /api/activities/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || '');
      const db = getDatabase();

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      const activity = await db.collection('Activity').findOne(query);
      if (!activity) {
        res.status(404).json({ success: false, error: 'Activity not found' });
        return;
      }

      res.json({
        success: true,
        activity: { ...activity, id: activity.id || String(activity._id) }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch activity' });
    }
  }

  /**
   * POST /api/activities and POST /api/admin/activities
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      const newActivity = {
        ...body,
        id: body.id || `ACT-${Date.now().toString().slice(-4)}`,
        isVisible: body.isVisible !== undefined ? body.isVisible : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('Activity').insertOne(newActivity);
      cacheService.invalidateTags(['activities', 'stats']);

      res.status(201).json({
        success: true,
        activity: { ...newActivity, _id: result.insertedId },
        message: 'Activity created successfully in MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create activity' });
    }
  }

  /**
   * PUT /api/activities and PUT /api/activities/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.body?.id || req.body?._id || '');
      const updates = { ...req.body, updatedAt: new Date() };
      delete updates.id;
      delete updates._id;

      if (!id) {
        res.status(400).json({ success: false, error: 'Activity ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await db.collection('Activity').updateOne(query, { $set: updates }, { upsert: true });
      cacheService.invalidateTags(['activities', 'stats']);

      res.json({
        success: true,
        message: 'Activity updated successfully in MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update activity' });
    }
  }

  /**
   * POST /api/activities/assign
   * Assign activity to clients and dispatch notifications to client panels
   */
  static async assign(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      const activityId = String(body.activityId || body.id || '');
      const activityTitle = body.activityTitle || body.title || 'Morning Mindfulness Meditation';
      const activityCategory = body.activityCategory || body.category || 'MINDFULNESS';
      const consultantId = String(body.consultantId || '');
      const consultantName = body.consultantName || body.therapistName || 'Your Consultant';
      const clients = Array.isArray(body.clients) ? body.clients : [];
      const assignedToNames = Array.isArray(body.assignedTo) 
        ? body.assignedTo 
        : clients.map((c: any) => c.clientName || c.name).filter(Boolean);

      if (!activityId && !activityTitle) {
        res.status(400).json({ success: false, error: 'Activity ID or Title is required' });
        return;
      }

      const searchConditions: any[] = [];
      if (activityId) {
        searchConditions.push({ id: activityId });
        searchConditions.push({ id: Number(activityId) || -1 });
        searchConditions.push({ id: `ACT-0${activityId}` });
        if (ObjectId.isValid(activityId)) {
          searchConditions.push({ _id: new ObjectId(activityId) });
        }
      }
      if (activityTitle) {
        const safeRegex = new RegExp(`^${activityTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        searchConditions.push({ name: activityTitle });
        searchConditions.push({ title: activityTitle });
        searchConditions.push({ name: { $regex: safeRegex } });
        searchConditions.push({ title: { $regex: safeRegex } });
      }

      const query = searchConditions.length > 0 ? { $or: searchConditions } : { id: activityId };

      const updateFields: any = {
        id: activityId || '1',
        name: activityTitle,
        title: activityTitle,
        categoryTag: activityCategory,
        category: activityCategory,
        assignedTo: assignedToNames,
        clientAssignments: clients,
        assignedTherapistId: consultantId,
        assignedTherapistName: consultantName,
        frequency: clients[0]?.frequency || body.frequency || 'Daily',
        timeOfDay: clients[0]?.timeOfDay || body.timeOfDay || 'Morning (8:00 AM)',
        updatedAt: new Date()
      };

      if (body.description) updateFields.description = body.description;
      if (body.duration) updateFields.duration = body.duration;
      if (body.difficulty) updateFields.difficulty = body.difficulty;
      if (body.imageUrl) updateFields.imageUrl = body.imageUrl;
      if (body.instructions) updateFields.instructions = body.instructions;
      if (body.dueDate) updateFields.dueDate = body.dueDate;

      // Update or upsert the activity in MongoDB Atlas
      await Promise.all([
        db.collection('Activity').updateMany(
          query,
          {
            $set: updateFields,
            $setOnInsert: {
              createdAt: new Date(),
              status: 'pending',
              isVisible: true
            }
          },
          { upsert: true }
        ),
        db.collection('activities').updateMany(
          query,
          {
            $set: updateFields,
            $setOnInsert: {
              createdAt: new Date(),
              status: 'pending',
              isVisible: true
            }
          },
          { upsert: true }
        ).catch(() => {})
      ]);

      // Create in-app notifications for each assigned client
      const notificationsToInsert: any[] = [];
      for (const client of clients) {
        const clientEmail = String(client.clientEmail || client.email || '').toLowerCase().trim();
        const clientId = String(client.clientId || client.id || '');
        const clientName = client.clientName || client.name || 'Client';
        const freq = client.frequency || 'Daily';
        const timeSlot = client.timeOfDay || 'Morning (8:00 AM)';

        const notifDoc = {
          id: `NOTIF-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          recipientId: clientId,
          recipientEmail: clientEmail,
          clientEmail: clientEmail,
          clientName: clientName,
          recipientRole: 'CLIENT',
          type: 'ACTIVITY_ASSIGNED',
          title: `New Activity Assigned: ${activityTitle} ⚡`,
          message: `Your consultant ${consultantName} assigned you "${activityTitle}" (${freq} • ${timeSlot}). Tap to start your therapeutic exercise.`,
          link: '/activities',
          activityId: activityId,
          activityTitle: activityTitle,
          frequency: freq,
          timeOfDay: timeSlot,
          consultantId: consultantId,
          consultantName: consultantName,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        notificationsToInsert.push(notifDoc);
      }

      if (notificationsToInsert.length > 0) {
        await db.collection('Notification').insertMany(notificationsToInsert).catch(() => {});
        await db.collection('notifications').insertMany(notificationsToInsert).catch(() => {});
      }

      cacheService.invalidateTags(['activities', 'stats', 'users']);

      res.status(200).json({
        success: true,
        message: `Activity assigned and ${notificationsToInsert.length} client notification(s) dispatched.`,
        assignedCount: notificationsToInsert.length,
        notifications: notificationsToInsert
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to assign activity' });
    }
  }

  /**
   * DELETE /api/activities and DELETE /api/activities/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || req.body?.id || '');

      if (!id) {
        res.status(400).json({ success: false, error: 'Activity ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await db.collection('Activity').deleteOne(query);
      cacheService.invalidateTags(['activities', 'stats']);

      res.json({
        success: true,
        message: 'Activity deleted successfully from MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete activity' });
    }
  }
}
