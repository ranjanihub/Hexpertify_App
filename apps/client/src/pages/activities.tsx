import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { 
  Activity, 
  Clock, 
  Sparkles, 
  Search, 
  Brain, 
  Heart, 
  Wind, 
  Smile, 
  Play,
  Repeat,
  BookOpen,
  Info,
  Check,
  Lock,
  Eye,
  Share2,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  FileText,
  Trash2,
  Filter,
  Layers,
  BarChart3,
  TrendingDown,
  ExternalLink,
  RotateCcw,
  User,
  Zap,
  Award,
  ChevronRight,
  X,
  Archive
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { ActivityGamePlayer } from "@/components/activity-game-player";
import { audioEngine } from "../activities/utils/therapeuticAudioEngine";
import { cn } from "@/lib/utils";
import { getUserActivities } from "@/lib/client-store";
import { getClientAuth } from "@/lib/auth";

export function getActivitySlug(titleOrName: string): string {
  if (!titleOrName) return "";
  return titleOrName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export interface ClientAssignment {
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  frequency: string;
  timeOfDay?: string;
}

export interface CompletedActivityResponse {
  id: string;
  activityId: string | number;
  activityTitle: string;
  category?: string;
  clientName: string;
  clientEmail: string;
  consultantName?: string;
  consultantEmail?: string;
  consultantId?: string;
  sharingPreference: "full" | "private" | string;
  isPrivate: boolean;
  completedAt: string;
  duration?: string;
  submissionData?: any;
}

const DEFAULT_SAMPLE_RESPONSES: CompletedActivityResponse[] = [
  {
    id: "RESP-001",
    activityId: "ACT-01",
    activityTitle: "Diaphragmatic Breathing",
    category: "BREATHING",
    clientName: "Sarah Jenkins",
    clientEmail: "sarah@example.com",
    consultantName: "Dr. Marcus Vance",
    sharingPreference: "full",
    isPrivate: false,
    completedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    duration: "5-10 minutes",
    submissionData: {
      completedCycles: 6,
      preTension: 7,
      postTension: 3,
      reflection: "Felt parasympathetic activation after the 3rd breath cycle. Heart rate slowed and chest tightness eased.",
      pacedPacingScore: "96% Consistency"
    }
  },
  {
    id: "RESP-002",
    activityId: "ACT-10",
    activityTitle: "Cognitive Restructuring (Thought Record)",
    category: "CBT",
    clientName: "Sarah Jenkins",
    clientEmail: "sarah@example.com",
    consultantName: "Dr. Marcus Vance",
    sharingPreference: "full",
    isPrivate: false,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    duration: "10-15 minutes",
    submissionData: {
      situation: "Upcoming team presentation tomorrow morning.",
      automaticThought: "I'm going to freeze and look completely unprepared in front of everyone.",
      cognitiveDistortion: "Catastrophizing & Mind Reading",
      rationalResponse: "I have prepared thoroughly and rehearsed. Feeling nervous is natural and does not mean failure.",
      beliefRatingBefore: 85,
      beliefRatingAfter: 20,
      emotionalShift: "Subjective anxiety dropped from 8/10 to 2/10"
    }
  },
  {
    id: "RESP-003",
    activityId: "ACT-02",
    activityTitle: "Box Breathing",
    category: "BREATHING",
    clientName: "Sarah Jenkins",
    clientEmail: "sarah@example.com",
    consultantName: "Dr. Marcus Vance",
    sharingPreference: "private",
    isPrivate: true,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    duration: "4-8 minutes",
    submissionData: {
      completedBoxes: 5,
      notes: "Quick evening reset after a busy workday. Centered my thoughts before resting."
    }
  }
];

export interface ActivityItem {
  id: number | string;
  _id?: string;
  name?: string;
  title: string;
  description: string;
  categoryTag?: string;
  category: "MINDFULNESS" | "CBT" | "GRATITUDE" | "BREATHING" | "SOMATIC" | string;
  difficulty?: "Easy" | "Medium" | "Hard" | string;
  duration?: string;
  repeat?: string;
  dueDate?: string;
  imageUrl?: string;
  status?: "pending" | "completed" | string;
  isPrivate?: boolean;
  sharingPreference?: "full" | "private" | string;
  instructions?: string;
  howItHelps?: string;
  benefits?: string[];
  filePath?: string;
  templateId?: string;
  isVisible?: boolean;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  assignedTo?: string[];
  clientAssignments?: ClientAssignment[];
  assignedClientName?: string;
  assignedClientEmail?: string;
  assignedTherapistName?: string;
  assignedTherapistId?: string;
  assignedTherapistEmail?: string;
  assignedInfo?: string;
  frequency?: string;
  timeOfDay?: string;
  [key: string]: any;
}

const INITIAL_ACTIVITIES: ActivityItem[] = [
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
    "instructions": "Deep belly breathing technique to reduce stress and anxiety naturally.\n\nBenefits:\n• Reduces Stress\n• Improves Focus\n• Enhances Relaxation",
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
    "instructions": "Navy SEAL breathing technique for staying calm under pressure with 4-4-4-4 pattern.\n\nBenefits:\n• Calms Mind\n• Reduces Anxiety\n• Improves Concentration",
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
    "frequency": "As Needed",
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
    "instructions": "The famous 4-7-8 breathing technique popularized by Dr. Andrew Weil is a simple yet powerful method for anxiety relief and better sleep. By following the pattern of inhale for 4 seconds, hold for 7 seconds, and exhale for 8 seconds, you activate your parasympathetic nervous system and experience deep relaxation.\n\nBenefits:\n• Promotes Better Sleep\n• Reduces Anxiety\n• Calms the Nervous System",
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
    "instructions": "This ancient yogic breathing technique alternates airflow between nostrils to balance the left and right brain hemispheres. By harmonizing your nervous system, it reduces stress, improves focus, and creates a profound sense of calm and mental clarity.\n\nBenefits:\n• Balances Brain Hemispheres\n• Promotes Deep Relaxation\n• Enhances Mental Clarity",
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
    "instructions": "Use mindfulness to anchor yourself in the present moment by describing your surroundings in detail. This grounding technique helps redirect anxious thoughts and brings you into the here-and-now through sensory awareness.\n\nBenefits:\n• Improves Presence\n• Grounds in Reality\n• Enhances Sensory Awareness",
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
    "frequency": "As Needed",
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
    "instructions": "This guided self-reassurance exercise helps you acknowledge difficult emotions with kindness and compassion. By speaking affirmations and reassurances to yourself, you rewire your nervous system to respond to stress with self-support instead of self-criticism, building lasting emotional resilience.\n\nBenefits:\n• Builds Self-Compassion\n• Reduces Emotional Overwhelm\n• Strengthens Inner Resilience",
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
    "instructions": "Engage your five senses through tactile and physical experiences to bring you fully into the present moment. This somatic grounding technique interrupts the stress response cycle by signaling to your nervous system that you are safe, helping you move out of fight-or-flight mode into calm awareness.\n\nBenefits:\n• Anchors You in Your Body\n• Releases Trauma Responses\n• Activates Safety Signals",
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
    "instructions": "Your body and mind are deeply connected. By intentionally adjusting your posture and releasing tension through gentle movements, you signal to your nervous system that you are safe and grounded. This practice helps you reclaim your physical presence and mental clarity.\n\nBenefits:\n• Releases Physical Tension\n• Improves Body Awareness\n• Restores Natural Alignment",
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
    "frequency": "As Needed",
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
    "instructions": "Drawing from Dialectical Behavior Therapy (DBT), this technique teaches you to soothe yourself through multisensory engagement. By intentionally activating your senses—touch, smell, taste, sight, sound—you create a safe container for emotional pain and build your capacity to tolerate distressing moments.\n\nBenefits:\n• Soothes Emotional Pain\n• Provides Immediate Relief\n• Builds Distress Tolerance",
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
    "instructions": "Using Cognitive Behavioral Therapy techniques, challenge automatic negative thoughts by examining the evidence for and against them. Develop balanced, realistic perspectives that reduce anxiety, low mood, and self-criticism through cognitive restructuring.\n\nBenefits:\n• Challenges Negative Thinking\n• Reduces Anxiety\n• Builds Emotional Resilience",
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
    "instructions": "Transform negative self-talk into powerful, personalized affirmations that rewire your brain toward self-compassion. By mirroring empowering statements back to yourself, you create new neural pathways that support lasting confidence, resilience, and emotional wellbeing.\n\nBenefits:\n• Boosts Self-Esteem\n• Builds Self-Compassion\n• Reduces Negative Self-Talk",
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
    "frequency": "As Needed",
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
    "instructions": "Externalize your worries by placing them somewhere safe—outside your mind. This CBT-based technique helps your brain interpret the worry as \"stored and contained,\" reducing its emotional intensity. When worries feel infinite in your head, simply writing them down and placing them away creates essential psychological distance.\n\nBenefits:\n• Reduces Mental Clutter\n• Prevents Rumination\n• Increases Emotional Control",
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
    "instructions": "Engage your mind with focused mental exercises like counting, naming, and sensory grounding to shift attention away from worry and anchor you in the present.\n\nBenefits:\n• Interrupts Anxiety\n• Sharpens Focus\n• Grounds in Present",
    "createdAt": "2026-10-02T06:00:13.370Z",
    "updatedAt": "2026-10-02T06:00:13.370Z"
  }
];

const CATEGORIES = ["All", "MINDFULNESS", "CBT", "GRATITUDE", "BREATHING", "SOMATIC", "EXPOSURE", "BEHAVIORAL"];

export default function ActivitiesPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [, clientSlugParams] = useRoute<{ slug: string }>('/client/activities/:slug');
  const [, activitiesSlugParams] = useRoute<{ slug: string }>('/activities/:slug');
  const [, consultantSlugParams] = useRoute<{ slug: string }>('/consultant/activities/:slug');

  // Parse dedicated activity slug from route params or pathname
  const currentPath = location.split('?')[0].replace(/\/+$/, '');
  const pathParts = currentPath.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  const isDedicatedSlugPath = 
    (currentPath.startsWith('/activities/') || currentPath.startsWith('/client/activities/') || currentPath.startsWith('/consultant/activities/')) &&
    lastPart && lastPart !== 'activities';

  const routeSlug = clientSlugParams?.slug || activitiesSlugParams?.slug || consultantSlugParams?.slug || (isDedicatedSlugPath ? lastPart : undefined);

  const authUser = getClientAuth();
  const myName = authUser?.name || "Client User";
  const myEmail = (authUser?.email || "").toLowerCase().trim();
  const myTherapistName = authUser?.assignedTherapistName || "Assigned Therapist";

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  /** A template shown with my ActivityAssignment: its schedule, therapist and status */
  const withAssignment = (t: ActivityItem, asn: any): ActivityItem => ({
    ...t,
    assignmentId: String(asn.id),
    status: asn.status === "completed" ? "completed" : "pending",
    completedAt: asn.completedAt || null,
    assignedTo: [myName],
    clientAssignments: [{
      clientId: asn.clientId,
      clientName: asn.clientName || myName,
      clientEmail: asn.clientEmail || myEmail,
      frequency: asn.frequency || t.frequency || "Daily",
      timeOfDay: asn.timeOfDay || t.timeOfDay || "Morning (8:00 AM)"
    }],
    assignedTherapistName: asn.consultantName || myTherapistName,
    assignedTherapistId: asn.consultantId,
    frequency: asn.frequency || t.frequency || "Daily",
    timeOfDay: asn.timeOfDay || t.timeOfDay || "Morning (8:00 AM)"
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Top-level Navigation Mode: "library" | "responses"
  const [activePageTab, setActivePageTab] = useState<"library" | "responses">("library");

  // Responses State & Filters
  const [responsesList, setResponsesList] = useState<CompletedActivityResponse[]>([]);
  const [selectedResponseModal, setSelectedResponseModal] = useState<CompletedActivityResponse | null>(null);
  const [responseSearchQuery, setResponseSearchQuery] = useState<string>("");
  const [responseCategoryFilter, setResponseCategoryFilter] = useState<string>("All");
  const [responsePrivacyFilter, setResponsePrivacyFilter] = useState<"all" | "shared" | "private">("all");

  // Preview / Game Modal State
  const [activeActivity, setActiveActivity] = useState<ActivityItem | null>(null);
  const [previewTab, setPreviewTab] = useState<"game" | "instructions">("game");

  // Post-Activity Privacy & Sharing Selection Dialog State
  const [completedActivityToReview, setCompletedActivityToReview] = useState<{
    activity: ActivityItem;
    data?: any;
  } | null>(null);
  const [sharingChoice, setSharingChoice] = useState<"full" | "private">("full");

  // Synchronize route slug with activeActivity
  useEffect(() => {
    if (!routeSlug) {
      if (activeActivity && !completedActivityToReview) {
        setActiveActivity(null);
      }
      return;
    }

    const cleanSlug = decodeURIComponent(routeSlug).toLowerCase().trim();
    const matched = activities.find((act) => {
      const actTitleSlug = getActivitySlug(act.title);
      const actNameSlug = getActivitySlug(act.name || '');
      const actId = String(act.id || '').toLowerCase();
      const rawTitle = act.title.toLowerCase();

      return (
        actTitleSlug === cleanSlug ||
        actNameSlug === cleanSlug ||
        actId === cleanSlug ||
        cleanSlug.includes(actTitleSlug) ||
        actTitleSlug.includes(cleanSlug) ||
        cleanSlug.replace(/-/g, '').includes(rawTitle.replace(/\s+/g, '')) ||
        rawTitle.replace(/\s+/g, '').includes(cleanSlug.replace(/-/g, ''))
      );
    }) || INITIAL_ACTIVITIES.find((act) => {
      const actTitleSlug = getActivitySlug(act.title);
      const actNameSlug = getActivitySlug(act.name || '');
      const actId = String(act.id || '').toLowerCase();
      const rawTitle = act.title.toLowerCase();
      return (
        actTitleSlug === cleanSlug || 
        actNameSlug === cleanSlug || 
        actId === cleanSlug ||
        cleanSlug.includes(actTitleSlug) ||
        actTitleSlug.includes(cleanSlug) ||
        cleanSlug.replace(/-/g, '').includes(rawTitle.replace(/\s+/g, ''))
      );
    });

    if (matched) {
      setActiveActivity(matched);
      setPreviewTab("game");
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;
    }
  }, [routeSlug, activities]);

  // Ensure view always starts from the title at the top of the page whenever activeActivity changes
  useEffect(() => {
    if (activeActivity) {
      const scrollToTitleTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        const mainEl = document.querySelector('main');
        if (mainEl) mainEl.scrollTop = 0;
      };

      scrollToTitleTop();
      // Double check on next animation frame and after small tick to ensure newly rendered title starts at the top
      const rafId = requestAnimationFrame(scrollToTitleTop);
      const timer = setTimeout(scrollToTitleTop, 50);
      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timer);
      };
    }
  }, [activeActivity]);

  // Load activities from MongoDB Atlas API & Notifications & localStorage
  useEffect(() => {
    let isMounted = true;
    async function loadActivities() {
      try {
        const myId = String(authUser?.id || "").trim();
        const assignmentQuery = [
          myEmail ? `clientEmail=${encodeURIComponent(myEmail)}` : "",
          myId ? `clientId=${encodeURIComponent(myId)}` : ""
        ].filter(Boolean).join("&");
        const [actRes, asnRes] = await Promise.all([
          fetch("/api/activities").catch(() => null),
          assignmentQuery ? fetch(`/api/activities/assignments?${assignmentQuery}`).catch(() => null) : Promise.resolve(null)
        ]);

        // Activity templates: from the API only; the built-in list is used only when the API fails
        // entirely, and never with its sample assignees
        let rawActivities: any[];
        if (actRes && actRes.ok) {
          const data = await actRes.json().catch(() => null);
          rawActivities = Array.isArray(data?.activities) ? data.activities : [];
        } else {
          rawActivities = INITIAL_ACTIVITIES;
        }

        const templates: ActivityItem[] = rawActivities.map((a: any, idx: number) => ({
          ...a,
          id: a.id || a._id || idx + 1,
          title: a.title || a.name || "Wellness Activity",
          description: a.description || "Guided therapeutic session.",
          category: (a.categoryTag || a.category || "MINDFULNESS").toUpperCase(),
          difficulty: a.difficulty || "Easy",
          duration: a.duration || "10 min",
          dueDate: a.dueDate || "Today",
          imageUrl: a.imageUrl || a.image || "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
          status: "pending",
          completedAt: null,
          instructions: a.instructions || a.description || "",
          assignedTo: [],
          clientAssignments: [],
          assignedClientName: undefined,
          assignedClientEmail: undefined,
          assignedTherapistName: undefined,
          assignedTherapistId: undefined,
          assignedInfo: undefined,
          assignmentId: undefined,
          frequency: a.repeat || a.frequency || "Daily",
          timeOfDay: a.timeOfDay || "Morning (8:00 AM)"
        }));

        // My assignments (one ActivityAssignment per assigned activity); the newest one per activity wins
        let myAssignments: any[] = [];
        if (asnRes && asnRes.ok) {
          const asnData = await asnRes.json().catch(() => null);
          myAssignments = Array.isArray(asnData?.assignments) ? asnData.assignments : [];
        }
        const latestByActivity = new Map<string, any>();
        myAssignments.forEach((asn) => {
          const key = String(asn.activityId);
          const prev = latestByActivity.get(key);
          // A pending assignment outranks a completed one; otherwise the newest wins
          if (!prev || (prev.status === "completed" && asn.status !== "completed") ||
              (prev.status === asn.status && new Date(asn.assignedAt).getTime() > new Date(prev.assignedAt).getTime())) {
            latestByActivity.set(key, asn);
          }
        });

        const merged: ActivityItem[] = templates.map((t) => {
          const asn = latestByActivity.get(String(t.id));
          if (!asn) return t;
          latestByActivity.delete(String(t.id));
          return withAssignment(t, asn);
        });
        // Assignments whose template is no longer in the library still show up
        latestByActivity.forEach((asn) => {
          merged.push(withAssignment({
            id: asn.activityId,
            title: asn.activityTitle || "Wellness Activity",
            description: "Guided therapeutic exercise assigned by your consultant.",
            category: "MINDFULNESS",
            difficulty: "Easy",
            duration: "10 min",
            dueDate: "Today",
            imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
            status: "pending"
          }, asn));
        });

        if (isMounted) {
          setActivities(merged);
        }

        // Load Responses Log strictly for current user
        try {
          const rawLogs = localStorage.getItem("completed_activities_log");
          if (rawLogs) {
            const parsed = JSON.parse(rawLogs);
            if (Array.isArray(parsed)) {
              const myLogs = parsed.filter((log: any) => {
                const logEmail = String(log.clientEmail || '').toLowerCase().trim();
                const logName = String(log.clientName || '').toLowerCase().trim();
                const curEmail = String(myEmail || '').toLowerCase().trim();
                const curName = String(myName || '').toLowerCase().trim();
                if (curEmail && logEmail) return logEmail === curEmail;
                if (curName && logName) return logName.includes(curName) || curName.includes(logName);
                return !logEmail && !logName;
              });
              if (isMounted) setResponsesList(myLogs);
            }
          } else {
            if (isMounted) setResponsesList([]);
          }
        } catch {
          if (isMounted) setResponsesList([]);
        }
      } catch (err) {
        console.error("Failed to load activities:", err);
      }
    }

    loadActivities();
    const interval = setInterval(loadActivities, 10000);
    window.addEventListener('notification_created', loadActivities);
    window.addEventListener('client_data_updated', loadActivities);
    window.addEventListener('auth_state_change', loadActivities);
    window.addEventListener('storage', loadActivities);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('notification_created', loadActivities);
      window.removeEventListener('client_data_updated', loadActivities);
      window.removeEventListener('auth_state_change', loadActivities);
      window.removeEventListener('storage', loadActivities);
    };
  }, [myName, myEmail, myTherapistName]);

  const handleDeleteResponse = (responseId: string) => {
    try {
      const allLogs = JSON.parse(localStorage.getItem("completed_activities_log") || "[]");
      const updatedAll = Array.isArray(allLogs) ? allLogs.filter((r: any) => r.id !== responseId) : [];
      localStorage.setItem("completed_activities_log", JSON.stringify(updatedAll));
      setResponsesList((prev) => prev.filter((r) => r.id !== responseId));
      window.dispatchEvent(new Event("client_data_updated"));
      toast({
        title: "Response Removed",
        description: "Activity response record was removed from your history.",
      });
      if (selectedResponseModal?.id === responseId) {
        setSelectedResponseModal(null);
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not remove response log.",
        variant: "destructive"
      });
    }
  };

  const handlePreviewActivity = (act: ActivityItem) => {
    const slug = getActivitySlug(act.title);
    const basePath = location.startsWith('/client/activities') 
      ? '/client/activities' 
      : location.startsWith('/consultant/activities') 
      ? '/consultant/activities' 
      : '/activities';
    setLocation(`${basePath}/${slug}`);
    setActiveActivity(act);
    setPreviewTab("game");
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  };

  const handleBackToLibrary = () => {
    try {
      audioEngine.stopSpeaking();
    } catch {}
    const basePath = location.startsWith('/client/activities') 
      ? '/client/activities' 
      : location.startsWith('/consultant/activities') 
      ? '/consultant/activities' 
      : '/activities';
    setLocation(basePath);
    setActiveActivity(null);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  };

  const handleActivityCompleted = (submissionData?: any) => {
    if (!activeActivity) return;
    const current = activeActivity;
    setActiveActivity(null);
    setCompletedActivityToReview({ activity: current, data: submissionData });
    setSharingChoice("full");
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleConfirmPrivacyAndSave = async () => {
    if (!completedActivityToReview) return;
    const { activity, data } = completedActivityToReview;
    const isPrivate = sharingChoice === "private";

    // Play clinical completion audio
    try {
      audioEngine.playSuccess();
    } catch {}

    // Update local activities state
    setActivities(prev =>
      prev.map(a =>
        String(a.id) === String(activity.id)
          ? {
              ...a,
              status: "completed",
              isPrivate,
              sharingPreference: sharingChoice,
              completedAt: new Date().toISOString()
            }
          : a
      )
    );

    // Assigned activities are completed on the server, which notifies the assigned therapist
    let savedToServer = false;
    if (activity.assignmentId) {
      try {
        const res = await fetch(`/api/activities/assignments/${encodeURIComponent(String(activity.assignmentId))}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientEmail: myEmail,
            clientId: authUser?.id || "",
            isPrivate,
            sharingPreference: sharingChoice,
            submission: isPrivate ? null : (data || { completed: true, timestamp: new Date().toISOString() })
          })
        });
        savedToServer = res.ok;
      } catch {}
      if (!savedToServer) {
        toast({
          title: "Could not save completion",
          description: "Your therapist was not notified. Please check your connection and try again.",
          variant: "destructive"
        });
      }
    }

    const targetConsultantEmail = String(activity.assignedTherapistEmail || authUser?.assignedTherapistEmail || "").toLowerCase().trim();
    const targetConsultantId = String(activity.assignedTherapistId || authUser?.assignedTherapistId || "").trim();
    const targetConsultantName = String(activity.assignedTherapistName || authUser?.assignedTherapistName || "Assigned Consultant").trim();

    // Persist to local completed activities log (with full response data for client review)
    try {
      const existingLogs = JSON.parse(localStorage.getItem("completed_activities_log") || "[]");
      const newEntry: CompletedActivityResponse = {
        id: `RESP-${Date.now()}`,
        activityId: activity.id,
        activityTitle: activity.title,
        category: activity.category,
        clientName: myName,
        clientEmail: myEmail,
        consultantName: targetConsultantName,
        consultantEmail: targetConsultantEmail,
        consultantId: targetConsultantId,
        sharingPreference: sharingChoice,
        isPrivate,
        completedAt: new Date().toISOString(),
        duration: activity.duration || "5-10 min",
        submissionData: data || { completed: true, timestamp: new Date().toISOString() }
      };
      const updatedList = [newEntry, ...existingLogs];
      localStorage.setItem("completed_activities_log", JSON.stringify(updatedList));
      setResponsesList(updatedList);
      window.dispatchEvent(new Event("client_data_updated"));
    } catch (err) {
      console.error("Failed to save completed activity log:", err);
    }

    // Practice runs of unassigned activities: tell the client's therapist from here
    if (!activity.assignmentId && (targetConsultantEmail || targetConsultantId)) try {
      const notifPayload = {
        recipientRole: "CONSULTANT",
        recipientEmail: targetConsultantEmail || undefined,
        recipientId: targetConsultantId || undefined,
        consultantEmail: targetConsultantEmail || undefined,
        consultantId: targetConsultantId || undefined,
        consultantName: targetConsultantName,
        clientName: myName,
        clientEmail: myEmail,
        title: isPrivate 
          ? `Task Completed: ${activity.title}`
          : `Activity Completed with Insights: ${activity.title}`,
        message: isPrivate
          ? `${myName} completed the activity "${activity.title}". Detailed responses were kept private by the client.`
          : `${myName} completed "${activity.title}" and shared detailed results, scores, and reflection notes.`,
        type: "ACTIVITY_COMPLETED",
        activityId: activity.id,
        activityTitle: activity.title,
        isPrivate,
        sharingPreference: sharingChoice,
        submissionData: isPrivate ? null : data,
        timestamp: new Date().toISOString()
      };

      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifPayload)
      }).catch(() => {});

      window.dispatchEvent(new Event("notification_created"));
    } catch {}
    if (savedToServer) window.dispatchEvent(new Event("client_data_updated"));

    // Show toast without doctor name
    if (isPrivate) {
      toast({
        title: "Activity Completed (Private)",
        description: "Your results remain private to you. Your assigned consultant was notified that the task is completed.",
      });
    } else {
      toast({
        title: "Activity Completed & Shared",
        description: "Full results and reflection metrics were shared with your assigned consultant.",
      });
    }

    setCompletedActivityToReview(null);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "MINDFULNESS":
        return <Brain className="w-3.5 h-3.5" />;
      case "CBT":
        return <Sparkles className="w-3.5 h-3.5" />;
      case "GRATITUDE":
        return <Heart className="w-3.5 h-3.5" />;
      case "BREATHING":
        return <Wind className="w-3.5 h-3.5" />;
      case "SOMATIC":
        return <Smile className="w-3.5 h-3.5" />;
      default:
        return <Activity className="w-3.5 h-3.5" />;
    }
  };

  // Assigned to this client = has one of my ActivityAssignments (matched by my email / user id on the server)
  const isAssignedToMe = (act: ActivityItem): boolean => Boolean(act.assignmentId);

  const assignedActivities = activities.filter(isAssignedToMe);

  const filteredAllActivities = activities.filter((act) => {
    const matchesCategory =
      selectedCategory === "All"
        ? true
        : act.category === selectedCategory;

    const matchesSearch =
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // ─────────────────────────────────────────────────────────────
  // 1. FULL PAGE VIEW: Post-Activity Privacy & Sharing Review
  // ─────────────────────────────────────────────────────────────
  if (completedActivityToReview) {
    return (
      <div className="space-y-6 pb-20 font-['Plus_Jakarta_Sans'] max-w-4xl mx-auto animate-in fade-in duration-300">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCompletedActivityToReview(null)}
            className="rounded-2xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs h-10 px-4 gap-2 cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Activities Library</span>
          </Button>
          <span className="text-xs font-semibold text-slate-400">
            Step 2 of 2: Completion & Sharing
          </span>
        </div>

        {/* Completion Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-[#4f28d9] via-[#3b1799] to-slate-950 text-white p-8 sm:p-10 relative overflow-hidden shadow-xl border border-purple-500/20">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300 text-xs font-bold shadow-inner">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>EXERCISE COMPLETED</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {completedActivityToReview.activity.title}
              </h1>
              <p className="text-purple-100/90 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                Great job completing this session! Choose how you would like to share your activity completion and results with your assigned consultant.
              </p>
            </div>
          </div>
        </div>

        {/* Sharing Options Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Sharing & Privacy Preferences
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Choose what level of information is synchronized with your care team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Full Results */}
            <div
              onClick={() => setSharingChoice("full")}
              className={cn(
                "p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-4 select-none",
                sharingChoice === "full"
                  ? "border-[#5e2be2] bg-[#5e2be2]/5 dark:bg-[#5e2be2]/10 shadow-md ring-2 ring-[#5e2be2]/30"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50"
              )}
            >
              <div className="flex items-start gap-3.5">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  sharingChoice === "full" ? "bg-[#5e2be2] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                )}>
                  <Share2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Share Full Results
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    Your consultant can review your detailed reflection notes, ratings, scores, and pacing metrics to tailor upcoming sessions.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-medium text-slate-400">Collaborative care</span>
                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                  sharingChoice === "full" ? "border-[#5e2be2] bg-[#5e2be2] text-white" : "border-slate-300 dark:border-slate-700"
                )}>
                  {sharingChoice === "full" && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            </div>

            {/* Option 2: Keep Private */}
            <div
              onClick={() => setSharingChoice("private")}
              className={cn(
                "p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-4 select-none",
                sharingChoice === "private"
                  ? "border-[#5e2be2] bg-[#5e2be2]/5 dark:bg-[#5e2be2]/10 shadow-md ring-2 ring-[#5e2be2]/30"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50"
              )}
            >
              <div className="flex items-start gap-3.5">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  sharingChoice === "private" ? "bg-[#5e2be2] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                )}>
                  <Lock className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Keep Private & Notify
                    </h4>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      Private
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    Keep your detailed answers and personal reflections confidential to you. Your consultant will only receive a notification that this task was completed.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-medium text-slate-400">Strict privacy</span>
                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                  sharingChoice === "private" ? "border-[#5e2be2] bg-[#5e2be2] text-white" : "border-slate-300 dark:border-slate-700"
                )}>
                  {sharingChoice === "private" && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Privacy Notice */}
          <div className="flex items-center gap-2.5 p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 rounded-2xl text-xs text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-5 h-5 text-[#5e2be2] shrink-0" />
            <span>You have full autonomy over your records. You can adjust your sharing preferences at any time in your profile settings.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCompletedActivityToReview(null)}
              className="w-full sm:w-auto rounded-2xl h-12 px-6 text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel & Return
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPrivacyAndSave}
              className="w-full sm:w-auto rounded-2xl h-12 px-8 bg-[#5e2be2] hover:bg-[#4f28d9] text-white text-sm font-bold shadow-xl shadow-purple-500/25 gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Confirm & Complete Activity</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. FULL PAGE VIEW: Interactive Activity Player
  // ─────────────────────────────────────────────────────────────
  if (activeActivity) {
    return (
      <div id="activity-page-container" className="space-y-2 pb-2 font-['Plus_Jakarta_Sans',sans-serif] w-full max-w-5xl mx-auto animate-in fade-in duration-300">
        {/* Top Navigation Bar with Centered Activity Title */}
        <div id="activity-title-header" className="flex items-center justify-between gap-3 py-0.5">
          <Button
            variant="outline"
            onClick={handleBackToLibrary}
            className="w-fit rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs h-8 px-3 gap-1.5 cursor-pointer shadow-xs shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Button>

          {/* Centered Activity Title (Prominently framed) */}
          <div className="flex-1 text-center">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeActivity.title || activeActivity.name}
            </h1>
          </div>

          {/* Balanced spacer for perfect centering */}
          <div className="w-[72px] shrink-0 hidden sm:block" />
        </div>

        {/* Clean Interactive Activity Player */}
        <div className="w-full">
          <ActivityGamePlayer 
            activity={activeActivity} 
            onComplete={handleActivityCompleted}
          />
        </div>
      </div>
    );
  }

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "Recent";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return "Just now";
      if (diffMins < 60) return `${diffMins} mins ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffDays === 1) return `Yesterday at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dateStr;
    }
  };

  // Filtered responses for "My Responses" tab
  const filteredResponses = responsesList.filter((resp) => {
    const matchesCategory =
      responseCategoryFilter === "All" ||
      (resp.category && resp.category.toUpperCase() === responseCategoryFilter.toUpperCase());

    const matchesPrivacy =
      responsePrivacyFilter === "all" ||
      (responsePrivacyFilter === "shared" && !resp.isPrivate) ||
      (responsePrivacyFilter === "private" && resp.isPrivate);

    const query = responseSearchQuery.toLowerCase().trim();
    if (!query) return matchesCategory && matchesPrivacy;

    const dataStr = resp.submissionData ? JSON.stringify(resp.submissionData).toLowerCase() : "";
    const matchesSearch =
      resp.activityTitle.toLowerCase().includes(query) ||
      (resp.category && resp.category.toLowerCase().includes(query)) ||
      (resp.consultantName && resp.consultantName.toLowerCase().includes(query)) ||
      dataStr.includes(query);

    return matchesCategory && matchesPrivacy && matchesSearch;
  });

  const sharedResponsesCount = responsesList.filter(r => !r.isPrivate).length;
  const privateResponsesCount = responsesList.filter(r => r.isPrivate).length;

  // ─────────────────────────────────────────────────────────────
  // 3. FULL PAGE VIEW: Activities Library & My Responses Tabs
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-16 font-['Plus_Jakarta_Sans']">
      <PageHeader
        title={activePageTab === "library" ? "Activities Library" : "My Activity Responses"}
        description={
          activePageTab === "library"
            ? "Explore therapeutic exercises, guided meditations, and interactive mental health activities."
            : "Review your completed exercises, somatic reflections, thought records, and detailed metrics."
        }
        badge={activePageTab === "library" ? "MY ACTIVITIES" : "PERFORMANCE & INSIGHTS"}
        icon={activePageTab === "library" ? <Activity className="w-4 h-4 text-purple-200" /> : <FileText className="w-4 h-4 text-purple-200" />}
      >
        {/* Top Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-inner">
          <button
            type="button"
            onClick={() => setActivePageTab("library")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2",
              activePageTab === "library"
                ? "bg-white text-slate-900 shadow-md"
                : "text-white/80 hover:text-white hover:bg-white/10"
            )}
          >
            <Activity className="w-4 h-4" />
            <span>Activities Library</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
                activePageTab === "library"
                  ? "bg-purple-100 text-[#5e2be2]"
                  : "bg-white/20 text-white"
              )}
            >
              {assignedActivities.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePageTab("responses")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2",
              activePageTab === "responses"
                ? "bg-white text-slate-900 shadow-md"
                : "text-white/80 hover:text-white hover:bg-white/10"
            )}
          >
            <FileText className="w-4 h-4" />
            <span>My Responses</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
                activePageTab === "responses"
                  ? "bg-purple-100 text-[#5e2be2]"
                  : "bg-white/20 text-white"
              )}
            >
              {responsesList.length}
            </span>
          </button>
        </div>
      </PageHeader>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: ACTIVITIES LIBRARY
         ───────────────────────────────────────────────────────────── */}
      {activePageTab === "library" && (
        <div className="space-y-10 animate-in fade-in duration-300">
          {/* 1st: THERAPIST RECOMMENDATION / ASSIGNED BY THERAPIST */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#5e2be2]/10 text-[#5e2be2] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4 text-[#5e2be2]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Therapist Recommendations
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Exercises prescribed specifically for your personalized care plan
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-50 text-[#5e2be2] border border-purple-100">
                {assignedActivities.length} Prescribed
              </span>
            </div>

            {assignedActivities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignedActivities.map((act) => (
                  <div
                    key={act.id}
                    className="group bg-white rounded-3xl border border-purple-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between ring-1 ring-[#5e2be2]/10"
                  >
                    {/* Top Image Container */}
                    <div 
                      onClick={() => handlePreviewActivity(act)}
                      className="relative h-52 w-full overflow-hidden bg-slate-100 cursor-pointer"
                    >
                      <img
                        src={act.imageUrl}
                        alt={act.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>

                      {/* Category Tag (Top Left) */}
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider text-slate-900 flex items-center gap-1.5 shadow-sm border border-white/40">
                        {getCategoryIcon(act.category)}
                        <span>{act.category}</span>
                      </div>

                      {/* Assigned Tag (Top Right) */}
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                        <div className="bg-[#5e2be2] text-white px-3 py-1 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-md">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Therapist Recommendation</span>
                        </div>
                        {act.status === 'completed' && (
                          <div className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm backdrop-blur-md",
                            act.isPrivate 
                              ? "bg-amber-500/90 text-white border border-amber-300/40"
                              : "bg-emerald-600/90 text-white border border-emerald-300/40"
                          )}>
                            {act.isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            <span>{act.isPrivate ? "Completed (Private)" : "Completed (Shared)"}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div 
                        onClick={() => handlePreviewActivity(act)}
                        className="cursor-pointer"
                      >
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#5e2be2] transition-colors leading-snug mb-2">
                          {act.title}
                        </h3>
                        <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-3">
                          {act.description}
                        </p>
                      </div>

                      {/* Meta info & Action */}
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium border-t border-slate-100 pt-3">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>{act.duration}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Repeat className="w-4 h-4 text-slate-400" />
                            <span>{act.frequency || "Daily"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handlePreviewActivity(act)}
                            className={cn(
                              "w-full h-11 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-md gap-2",
                              act.status === 'completed'
                                ? "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
                                : "bg-[#5e2be2] hover:bg-[#4f28d9] text-white shadow-purple-500/20"
                            )}
                          >
                            <Play className="w-4 h-4 fill-white" />
                            <span>{act.status === 'completed' ? "Practice Again" : "Start Prescribed Activity"}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 text-center">
                <p className="text-slate-500 font-medium text-sm">No therapist activities currently assigned. Explore the full library below!</p>
              </div>
            )}
          </section>

          {/* 2nd: ALL ACTIVITIES (FULL LIBRARY) */}
          <section className="space-y-5 pt-4 border-t border-slate-100 dark:border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  All Activities
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Explore and practice guided therapeutic exercises from the library
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search activities..."
                  className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white border-slate-200 text-xs focus:ring-2 focus:ring-[#5e2be2]/20"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={
                      isActive
                        ? "bg-[#5e2be2] text-white shadow-md shadow-purple-500/20 rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                        : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-full px-5 py-2 text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                    }
                  >
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>

            {/* All Activities Cards Grid */}
            {filteredAllActivities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAllActivities.map((act) => {
                  const isRecommended = isAssignedToMe(act);
                  return (
                    <div
                      key={act.id}
                      className={cn(
                        "group bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between",
                        isRecommended ? "border-purple-200/90 ring-1 ring-purple-100" : "border-slate-200/80"
                      )}
                    >
                      {/* Top Image Container */}
                      <div 
                        onClick={() => handlePreviewActivity(act)}
                        className="relative h-52 w-full overflow-hidden bg-slate-100 cursor-pointer"
                      >
                        <img
                          src={act.imageUrl}
                          alt={act.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>

                        {/* Category Tag (Top Left) */}
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider text-slate-900 flex items-center gap-1.5 shadow-sm border border-white/40">
                          {getCategoryIcon(act.category)}
                          <span>{act.category}</span>
                        </div>

                        {/* Recommended Tag / Status (Top Right) */}
                        <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                          {isRecommended && (
                            <div className="bg-[#5e2be2] text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1 shadow-md">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Recommended</span>
                            </div>
                          )}
                          {act.status === 'completed' && (
                            <div className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm backdrop-blur-md",
                              act.isPrivate 
                                ? "bg-amber-500/90 text-white border border-amber-300/40"
                                : "bg-emerald-600/90 text-white border border-emerald-300/40"
                            )}>
                              {act.isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              <span>{act.isPrivate ? "Completed (Private)" : "Completed (Shared)"}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div 
                          onClick={() => handlePreviewActivity(act)}
                          className="cursor-pointer"
                        >
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#5e2be2] transition-colors leading-snug mb-2">
                            {act.title}
                          </h3>
                          <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-3">
                            {act.description}
                          </p>
                        </div>

                        {/* Meta info & Action */}
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium border-t border-slate-100 pt-3">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span>{act.duration}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Repeat className="w-4 h-4 text-slate-400" />
                              <span>{act.frequency || "Daily"}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handlePreviewActivity(act)}
                              className={cn(
                                "w-full h-11 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-md gap-2",
                                act.status === 'completed'
                                  ? "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
                                  : "bg-[#5e2be2] hover:bg-[#4f28d9] text-white shadow-purple-500/20"
                              )}
                            >
                              <Play className="w-4 h-4 fill-white" />
                              <span>{act.status === 'completed' ? "Practice Again" : "Start Activity"}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center">
                <p className="text-slate-500 font-medium text-sm">No activities found matching your search.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: MY RESPONSES & PERFORMANCE HISTORY
         ───────────────────────────────────────────────────────────── */}
      {activePageTab === "responses" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400">Total Activities Completed</p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {responsesList.length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-[#5e2be2] flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400">Shared with Consultant</p>
                <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {sharedResponsesCount}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400">Private Records</p>
                <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  {privateResponsesCount}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search by activity, thought, or reflection..."
                value={responseSearchQuery}
                onChange={(e) => setResponseSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-2xl border-slate-200 text-xs bg-slate-50/50 dark:bg-slate-800/50"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={responseCategoryFilter}
                onChange={(e) => setResponseCategoryFilter(e.target.value)}
                className="h-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-1 focus:ring-[#5e2be2]"
              >
                <option value="All">All Categories</option>
                <option value="BREATHING">Breathing</option>
                <option value="CBT">CBT</option>
                <option value="MINDFULNESS">Mindfulness</option>
                <option value="SOMATIC">Somatic</option>
                <option value="GRATITUDE">Gratitude</option>
              </select>

              <select
                value={responsePrivacyFilter}
                onChange={(e) => setResponsePrivacyFilter(e.target.value as any)}
                className="h-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-1 focus:ring-[#5e2be2]"
              >
                <option value="all">All Privacy Levels</option>
                <option value="shared">Shared with Consultant</option>
                <option value="private">Private (Client Only)</option>
              </select>
            </div>
          </div>

          {/* Responses Grid */}
          {filteredResponses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredResponses.map((resp) => {
                const data = resp.submissionData || {};
                const matchedActivity = activities.find(
                  (a) => String(a.id) === String(resp.activityId) || a.title.toLowerCase() === resp.activityTitle.toLowerCase()
                );

                return (
                  <div
                    key={resp.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-5"
                  >
                    {/* Header: Category & Timestamp & Privacy Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/50 text-[#5e2be2] border border-purple-200/50">
                            {getCategoryIcon(resp.category || "MINDFULNESS")}
                            <span>{resp.category || "EXERCISE"}</span>
                          </span>
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDateTime(resp.completedAt)}</span>
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug pt-1">
                          {resp.activityTitle}
                        </h3>
                      </div>

                      {/* Privacy Status */}
                      <div className="shrink-0">
                        {resp.isPrivate ? (
                          <div className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Private</span>
                          </div>
                        ) : (
                          <div className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Shared</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Performed Data Clinical Highlights */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-3 border border-slate-100 dark:border-slate-800/80">
                      {/* Worry Box (ACT-12) Quarantined Worry */}
                      {data.worryText && (
                        <div className="space-y-2 text-xs">
                          <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 p-3 rounded-2xl">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-extrabold text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                <Archive className="w-3.5 h-3.5" /> Quarantined Worry in Vault
                              </span>
                              {data.worryTime && (
                                <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                  ⏰ Designated Time: {data.worryTime}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 font-medium text-xs leading-relaxed italic bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-amber-100/60">
                              "{data.worryText}"
                            </p>
                          </div>
                        </div>
                      )}

                      {/* CBT Thought Record Highlight */}
                      {(data.automaticThought || data.thoughtData?.automaticThought) && (
                        <div className="space-y-2 text-xs">
                          {(data.situation || data.thoughtData?.situation) && (
                            <div className="text-slate-500 font-medium">
                              <span className="font-bold text-slate-700 dark:text-slate-300">Trigger:</span> {data.situation || data.thoughtData?.situation}
                            </div>
                          )}
                          <div className="bg-red-50/70 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 p-2.5 rounded-xl text-red-900 dark:text-red-300">
                            <span className="font-bold block text-[10px] uppercase tracking-wider text-red-600 mb-0.5">Automatic Thought</span>
                            "{data.automaticThought || data.thoughtData?.automaticThought}"
                          </div>
                          {(data.rationalResponse || data.thoughtData?.rationalResponse) && (
                            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-2.5 rounded-xl text-emerald-900 dark:text-emerald-300">
                              <span className="font-bold block text-[10px] uppercase tracking-wider text-emerald-600 mb-0.5">Balanced Perspective</span>
                              "{data.rationalResponse || data.thoughtData?.rationalResponse}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* Breathing / Breathwork Highlights */}
                      {(data.completedCycles || data.completedBoxes || data.completedRounds) && (
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                          <span className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl border border-blue-200/60 flex items-center gap-1.5">
                            <Wind className="w-4 h-4" />
                            <span>{data.completedCycles || data.completedBoxes || data.completedRounds} Paced Cycles Completed</span>
                          </span>
                          {data.pacedPacingScore && (
                            <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-200/60">
                              ⚡ {data.pacedPacingScore}
                            </span>
                          )}
                        </div>
                      )}

                      {/* PMR / Tension Shift */}
                      {data.preTension !== undefined && data.postTension !== undefined && (
                        <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60">
                          <span className="text-slate-500 font-medium">Tension Reduction:</span>
                          <div className="flex items-center gap-2 font-bold">
                            <span className="text-red-500">{data.preTension}/10</span>
                            <span className="text-slate-400">➔</span>
                            <span className="text-emerald-600">{data.postTension}/10</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              -{Math.round(((data.preTension - data.postTension) / (data.preTension || 1)) * 100)}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Emotional Resonance / Intensity */}
                      {data.selectedEmotion && (
                        <div className="text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Identified Emotion:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{data.selectedEmotion} ({data.intensity}/10)</span>
                          </div>
                          {data.selfCompassionStatement && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                              "{data.selfCompassionStatement}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Sensory Grounding Items */}
                      {Array.isArray(data.items) && data.items.length > 0 && (
                        <div className="text-xs space-y-1">
                          <span className="text-slate-500 font-medium">Sensory Anchors Identified:</span>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {data.items.slice(0, 4).map((item: string, i: number) => (
                              <span key={i} className="bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full text-[11px] border border-slate-200 dark:border-slate-700 font-medium">
                                • {item}
                              </span>
                            ))}
                            {data.items.length > 4 && (
                              <span className="text-[10px] text-slate-400 self-center">+{data.items.length - 4} more</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* DBT Multi-Sensory Items */}
                      {Array.isArray(data.selectedItems) && data.selectedItems.length > 0 && (
                        <div className="text-xs space-y-1">
                          <span className="text-slate-500 font-medium">Comfort Anchors Selected:</span>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {data.selectedItems.map((item: string, i: number) => (
                              <span key={i} className="bg-purple-50 dark:bg-purple-950/50 text-[#5e2be2] px-2.5 py-0.5 rounded-full text-[11px] border border-purple-200 font-medium">
                                ✓ {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Affirmations */}
                      {data.completedAffirmations && (
                        <div className="text-xs text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          <span>{data.completedAffirmations} Positive Affirmations Practiced</span>
                        </div>
                      )}

                      {/* Reflection Notes */}
                      {(data.reflection || data.notes) && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 italic border-l-2 border-[#5e2be2] pl-2.5 py-0.5">
                          "{data.reflection || data.notes}"
                        </div>
                      )}

                      {/* Fallback default message if minimal payload */}
                      {!data.worryText && !data.automaticThought && !data.thoughtData && !data.completedCycles && !data.completedBoxes && !data.completedRounds && !data.preTension && !data.selectedEmotion && !data.items && !data.selectedItems && !data.completedAffirmations && !data.reflection && !data.notes && (
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Session completed with full therapeutic protocol adherence.</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedResponseModal(resp)}
                          className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold h-9 px-3 gap-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </Button>

                        {matchedActivity && (
                          <Button
                            size="sm"
                            onClick={() => handlePreviewActivity(matchedActivity)}
                            className="rounded-xl bg-[#5e2be2] hover:bg-[#4f28d9] text-white text-xs font-bold h-9 px-3 gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Practice Again</span>
                          </Button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteResponse(resp.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                        title="Delete this record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/50 text-[#5e2be2] flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No activity responses found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Complete guided breathing, mindfulness, or cognitive reframing exercises to track your responses here.
                </p>
              </div>
              <Button
                onClick={() => setActivePageTab("library")}
                className="rounded-2xl bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs h-10 px-5 cursor-pointer"
              >
                <span>Browse Activities Library →</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          DETAILED ACTIVITY RESPONSE BREAKDOWN DIALOG MODAL
         ───────────────────────────────────────────────────────────── */}
      {selectedResponseModal && (
        <Dialog open={true} onOpenChange={() => setSelectedResponseModal(null)}>
          <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
            <DialogHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#5e2be2] border border-purple-200/50">
                  {getCategoryIcon(selectedResponseModal.category || "MINDFULNESS")}
                  <span>{selectedResponseModal.category || "WELLNESS EXERCISE"}</span>
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {formatDateTime(selectedResponseModal.completedAt)}
                </span>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {selectedResponseModal.activityTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Detailed performance record and submitted reflection data.
              </DialogDescription>
            </DialogHeader>

            {/* Sharing & Consultant Metadata */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Privacy Status:</span>
                {selectedResponseModal.isPrivate ? (
                  <span className="font-bold text-amber-600 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Client
                  </span>
                ) : (
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Synchronized with Care Team
                  </span>
                )}
              </div>
              {selectedResponseModal.consultantName && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50">
                  <span className="text-slate-500 font-medium">Assigned Consultant:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedResponseModal.consultantName}
                  </span>
                </div>
              )}
            </div>

            {/* Detailed Submission Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recorded Data
              </h4>

              {selectedResponseModal.submissionData ? (
                <div className="space-y-3">
                  {Object.entries(selectedResponseModal.submissionData).map(([key, val], idx) => {
                    if (val === null || val === undefined) return null;
                    const formattedKey = key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase());

                    if (typeof val === "object") {
                      return (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/60">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                            {formattedKey}
                          </span>
                          <pre className="text-[11px] font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                            {JSON.stringify(val, null, 2)}
                          </pre>
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 text-xs">
                        <span className="font-bold text-slate-600 dark:text-slate-400">
                          {formattedKey}:
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white max-w-md text-left sm:text-right">
                          {String(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
                  No extended numerical data recorded for this session.
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-row items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setSelectedResponseModal(null)}
                className="rounded-2xl text-xs font-semibold h-10 px-5 cursor-pointer"
              >
                Close
              </Button>

              <Button
                onClick={() => {
                  const act = activities.find(
                    (a) => String(a.id) === String(selectedResponseModal.activityId) || a.title.toLowerCase() === selectedResponseModal.activityTitle.toLowerCase()
                  );
                  if (act) {
                    setSelectedResponseModal(null);
                    handlePreviewActivity(act);
                  } else {
                    toast({
                      title: "Activity Not Found",
                      description: "The source activity template could not be loaded.",
                      variant: "destructive"
                    });
                  }
                }}
                className="rounded-2xl bg-[#5e2be2] hover:bg-[#4f28d9] text-white text-xs font-bold h-10 px-5 gap-1.5 cursor-pointer shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Practice Exercise Again</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
