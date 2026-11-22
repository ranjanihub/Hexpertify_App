import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Eye,
  Play,
  Sparkles,
  X,
  ChevronRight,
  BarChart3,
  Filter,
  ShieldAlert,
  Edit3,
  Download,
  Grid,
  List,
  Check,
  Award,
  BookOpen,
  Activity,
  Layers,
  HelpCircle,
  Smartphone,
  ClipboardCheck,
  Minus,
  TrendingDown,
  TrendingUp,
  User,
  UserPlus,
  Lock,
  Brain,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { getClientAuth, setClientAuth } from '@/lib/auth';
import { getUserSessions, SessionItem } from '@/lib/client-store';

const authUser = getClientAuth();
const currentUserName = authUser?.name || "Client User";

// Canonical Assessment Ordering & Definitions
export const ASSESSMENT_ORDER = [
  'PSS-10',
  'WHO-5',
  'WSAS',
  'PHQ-9',
  'GAD-7',
  'PCL-5',
  'OCI-R',
  'ASRS v1.1'
];

export const GENERAL_ASSESSMENT_ACRONYMS = ['PSS-10', 'WHO-5', 'WSAS'];
export const SPECIFIC_ASSESSMENT_ACRONYMS = ['PHQ-9', 'GAD-7', 'PCL-5', 'OCI-R', 'ASRS v1.1'];

const CLIENT_LIST = [
  currentUserName,
  "Sarah Jenkins",
  "Michael Chen",
  "Emily Rodriguez",
  "David Kim",
  "Jessica Taylor",
];

const FREQUENCY_OPTIONS = [
  { id: "Daily", label: "Daily Assessment" },
  { id: "2-3 Times / Week", label: "2-3 Times / Week" },
  { id: "Weekly", label: "Weekly Check-in" },
  { id: "Bi-weekly", label: "Bi-weekly Evaluation" },
  { id: "Monthly", label: "Monthly Progress Scale" },
  { id: "As Needed", label: "As Needed" },
];

const TIME_OPTIONS = [
  "Morning (8:00 AM)",
  "Midday (12:00 PM)",
  "Evening (6:00 PM)",
  "Before Bed (9:30 PM)",
];

// Types
export interface AssessmentOption {
  label: string;
  value: number;
}

export const cleanOptionLabel = (label?: string): string => {
  if (!label) return '';
  return label.replace(/\s*\(\d+\s*(?:pts?)?\)$/i, '').trim();
};

export interface AssessmentQuestion {
  id: string;
  text: string;
  subtext?: string;
  options: AssessmentOption[];
  isRiskTrigger?: boolean;
}

export interface AssessmentSeverityRange {
  minScore: number;
  maxScore: number;
  label: string;
  color: string;
  clinicalAction: string;
}

export interface ClinicalAssessment {
  id: string;
  title: string;
  acronym: string;
  questionCount: number;
  targetCondition: string;
  category?: string;
  timesCompleted: number;
  type: 'Standard' | 'Custom';
  description: string;
  estimatedMinutes?: number;
  validityScore?: string;
  targetPopulation?: string;
  authorOrSource?: string;
  questions?: AssessmentQuestion[];
  severityRanges?: AssessmentSeverityRange[];
  createdAt?: string;
  status?: 'Active' | 'Draft' | 'Archived';
  assignedClientCount?: number;
}

export interface AssessmentSubmission {
  id: string;
  assessmentId: string;
  assessmentAcronym: string;
  assessmentTitle: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientAvatar?: string;
  therapistName: string;
  completedAt: string;
  totalScore: number;
  maxScore: number;
  severityLabel: string;
  severityColor: string;
  flaggedRisk: boolean;
  answers: { questionId: string; questionText: string; answerLabel: string; score: number }[];
}

export interface AssessmentAssignment {
  id: string;
  assessmentId: string;
  assessmentAcronym: string;
  assessmentTitle: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientAvatar?: string;
  therapistName: string;
  assignedDate: string;
  dueDate: string;
  frequency: 'One-time' | 'Daily' | '2-3 Times / Week' | 'Weekly' | 'Bi-weekly' | 'Monthly' | 'As Needed' | string;
  status: 'Pending' | 'Completed' | 'Overdue';
}

// Mock Datasets (Synchronized with Super Admin)
export const mockClientsList = [
  { id: 'CL-101', name: 'Sarah Jenkins', therapy: 'CBT · Anxiety & Depression', therapist: 'Dr. Alex Harrison' },
  { id: 'CL-102', name: 'Michael Chen', therapy: 'ACT · Major Depression', therapist: 'Dr. Alex Harrison' },
  { id: 'CL-103', name: 'Emily Rodriguez', therapy: 'DBT · Distress Tolerance', therapist: 'Dr. Alex Harrison' },
  { id: 'CL-104', name: 'David Kim', therapy: 'CBT · Social Anxiety', therapist: 'Dr. Alex Harrison' },
  { id: 'CL-105', name: 'Jessica Taylor', therapy: 'CBT · Panic Protocol', therapist: 'Dr. Alex Harrison' },
  { id: 'CL-106', name: 'Sofia Rodriguez', therapy: 'ACT · Generalized Anxiety', therapist: 'Dr. Alex Harrison' },
  { id: 'CL-107', name: 'Marcus O\'Neill', therapy: 'Couples Therapy', therapist: 'Dr. Alex Harrison' },
];

export const mockAssessmentsData: ClinicalAssessment[] = [
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
      { minScore: 27, maxScore: 40, label: 'High Perceived Stress', color: 'bg-rose-600', clinicalAction: 'Targeted CBT stress reduction protocol and coping review indicated.' }
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
      { minScore: 0, maxScore: 6, label: 'Poor Well-Being (<25%)', color: 'bg-rose-600', clinicalAction: 'Screening for depression and formal assessment strongly indicated.' }
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
    targetCondition: 'Functioning',
    category: 'Functioning',
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
      { minScore: 0, maxScore: 9, label: 'Subthreshold Population', color: 'bg-emerald-500', clinicalAction: 'Minimal functional impairment.' },
      { minScore: 10, maxScore: 20, label: 'Significant Impairment', color: 'bg-amber-500', clinicalAction: 'Significant functional impairment with mild to moderate symptomatology.' },
      { minScore: 21, maxScore: 40, label: 'Severe Impairment', color: 'bg-rose-600', clinicalAction: 'Moderately severe or worse psychopathology indicating urgent functional rehabilitation.' }
    ],
    questions: [
      {
        id: 'ws1',
        text: 'Because of my problem my ability to work is impaired',
        subtext: '\'0\' means \'not at all impaired\' and \'8\' means very severely impaired to the point I can\'t work.',
        options: [
          { label: '0 - Not at all', value: 0 },
          { label: '1', value: 1 },
          { label: '2 - Slightly', value: 2 },
          { label: '3', value: 3 },
          { label: '4 - Definitely', value: 4 },
          { label: '5', value: 5 },
          { label: '6 - Markedly', value: 6 },
          { label: '7', value: 7 },
          { label: '8 - Very severely', value: 8 }
        ]
      },
      {
        id: 'ws2',
        text: 'Because of my problem my home management (cleaning, tidying, shopping, cooking, looking after home or children, paying bills) is impaired',
        options: [
          { label: '0 - Not at all', value: 0 },
          { label: '1', value: 1 },
          { label: '2 - Slightly', value: 2 },
          { label: '3', value: 3 },
          { label: '4 - Definitely', value: 4 },
          { label: '5', value: 5 },
          { label: '6 - Markedly', value: 6 },
          { label: '7', value: 7 },
          { label: '8 - Very severely', value: 8 }
        ]
      },
      {
        id: 'ws3',
        text: 'Because of my problem my social leisure activities (with other people e.g. parties, bars, clubs, outings, visits, dating, home entertaining) are impaired',
        options: [
          { label: '0 - Not at all', value: 0 },
          { label: '1', value: 1 },
          { label: '2 - Slightly', value: 2 },
          { label: '3', value: 3 },
          { label: '4 - Definitely', value: 4 },
          { label: '5', value: 5 },
          { label: '6 - Markedly', value: 6 },
          { label: '7', value: 7 },
          { label: '8 - Very severely', value: 8 }
        ]
      },
      {
        id: 'ws4',
        text: 'Because of my problem, my private leisure activities (done alone, such as reading, gardening, collecting, sewing, walking alone) are impaired',
        options: [
          { label: '0 - Not at all', value: 0 },
          { label: '1', value: 1 },
          { label: '2 - Slightly', value: 2 },
          { label: '3', value: 3 },
          { label: '4 - Definitely', value: 4 },
          { label: '5', value: 5 },
          { label: '6 - Markedly', value: 6 },
          { label: '7', value: 7 },
          { label: '8 - Very severely', value: 8 }
        ]
      },
      {
        id: 'ws5',
        text: 'Because of my problem, my ability to form and maintain close relationships with others, including those I live with, is impaired',
        options: [
          { label: '0 - Not at all', value: 0 },
          { label: '1', value: 1 },
          { label: '2 - Slightly', value: 2 },
          { label: '3', value: 3 },
          { label: '4 - Definitely', value: 4 },
          { label: '5', value: 5 },
          { label: '6 - Markedly', value: 6 },
          { label: '7', value: 7 },
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
    description: 'Standardized 9-question instrument for screening and tracking depression severity over time.',
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
      { minScore: 20, maxScore: 27, label: 'Severe Depression', color: 'bg-purple-600', clinicalAction: 'Immediate evaluation and referral to specialty psychiatric care.' }
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
      { minScore: 15, maxScore: 21, label: 'Severe Anxiety', color: 'bg-rose-600', clinicalAction: 'Active intervention and medical/psychiatric evaluation.' }
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
    description: '20-item self-report measure assessing the 20 DSM-5 symptoms of PTSD. Cutoff score of 33 indicates probable PTSD.',
    estimatedMinutes: 8,
    validityScore: "Cronbach's α = 0.94",
    targetPopulation: 'Trauma Survivors & Adults',
    authorOrSource: 'Weathers et al. (2013) / VA National Center for PTSD',
    status: 'Active',
    assignedClientCount: 240,
    createdAt: '2025-01-20',
    severityRanges: [
      { minScore: 0, maxScore: 32, label: 'Subthreshold Symptoms', color: 'bg-emerald-500', clinicalAction: 'Does not meet provisional cut-point threshold.' },
      { minScore: 33, maxScore: 45, label: 'Moderate PTSD (Probable)', color: 'bg-amber-500', clinicalAction: 'Meets the probable PTSD cutoff. Structured CAPS-5 evaluation indicated.' },
      { minScore: 46, maxScore: 80, label: 'Severe PTSD Symptoms', color: 'bg-rose-600', clinicalAction: 'High symptom burden. Trauma-focused psychotherapy (EMDR / CPT) indicated.' }
    ],
    questions: [
      { id: 'p1', text: 'Repeated, disturbing, and unwanted memories of the stressful experience?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p2', text: 'Repeated, disturbing dreams of the stressful experience?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p3', text: 'Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p4', text: 'Feeling very upset when something reminded you of the stressful experience?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p5', text: 'Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p6', text: 'Avoiding memories, thoughts, or feelings related to the stressful experience?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p7', text: 'Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p8', text: 'Trouble remembering important parts of the stressful experience?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p9', text: 'Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p10', text: 'Blaming yourself or someone else for the stressful experience or what happened after it?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p11', text: 'Having strong negative feelings such as fear, horror, anger, guilt, or shame?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p12', text: 'Loss of interest in activities that you used to enjoy?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p13', text: 'Feeling distant or cut off from other people?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
      { id: 'p14', text: 'Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?', options: [{ label: 'Not at all (0)', value: 0 }, { label: 'A little bit (1)', value: 1 }, { label: 'Moderately (2)', value: 2 }, { label: 'Quite a bit (3)', value: 3 }, { label: 'Extremely (4)', value: 4 }] },
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
      { minScore: 0, maxScore: 20, label: 'Subthreshold OCD Symptoms', color: 'bg-emerald-500', clinicalAction: 'Does not exceed recommended cutoff threshold.' },
      { minScore: 21, maxScore: 40, label: 'OCD Elevation', color: 'bg-amber-500', clinicalAction: 'Exceeds recommended cutoff (≥21). Interview for OCD indicated.' },
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
      { minScore: 4, maxScore: 6, label: 'Likely Adult ADHD (Part A Criterion Met)', color: 'bg-rose-600', clinicalAction: 'Part A screening criterion met (≥4 shaded items). Comprehensive ADHD evaluation recommended.' }
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
      { id: 'a16', text: 'When you\'re in a conversation, how often do you find yourself finishing the sentences of the people you are talking to, before they can finish them themselves?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (1)', value: 1 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a17', text: 'How often do you have difficulty waiting your turn in situations when turn taking is required?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (0)', value: 0 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] },
      { id: 'a18', text: 'How often do you interrupt others when they are busy?', options: [{ label: 'Never (0)', value: 0 }, { label: 'Rarely (0)', value: 0 }, { label: 'Sometimes (1)', value: 1 }, { label: 'Often (1)', value: 1 }, { label: 'Very Often (1)', value: 1 }] }
    ]
  }
];

export const mockSubmissionsData: AssessmentSubmission[] = [
  {
    id: 'SUB-901',
    assessmentId: 'ASS-04',
    assessmentAcronym: 'PHQ-9',
    assessmentTitle: 'Patient Health Questionnaire-9',
    clientId: 'CL-101',
    clientName: 'Sarah Jenkins',
    therapistName: 'Dr. Alex Harrison',
    completedAt: '2026-08-01 14:32',
    totalScore: 16,
    maxScore: 27,
    severityLabel: 'Moderately Severe Depression',
    severityColor: 'bg-rose-600 text-white',
    flaggedRisk: true,
    answers: [
      { questionId: 'q1', questionText: 'Little interest or pleasure in doing things', answerLabel: 'More than half the days (2)', score: 2 },
      { questionId: 'q2', questionText: 'Feeling down, depressed, or hopeless', answerLabel: 'Nearly every day (3)', score: 3 },
      { questionId: 'q3', questionText: 'Trouble falling or staying asleep', answerLabel: 'More than half the days (2)', score: 2 },
      { questionId: 'q9', questionText: 'Thoughts of self-harm or hurting yourself', answerLabel: 'Several days (1)', score: 1 }
    ]
  },
  {
    id: 'SUB-902',
    assessmentId: 'ASS-05',
    assessmentAcronym: 'GAD-7',
    assessmentTitle: 'Generalized Anxiety Disorder-7',
    clientId: 'CL-102',
    clientName: 'Michael Chen',
    therapistName: 'Dr. Alex Harrison',
    completedAt: '2026-08-01 11:15',
    totalScore: 8,
    maxScore: 21,
    severityLabel: 'Mild Anxiety',
    severityColor: 'bg-amber-500 text-white',
    flaggedRisk: false,
    answers: [
      { questionId: 'g1', questionText: 'Feeling nervous, anxious, or on edge', answerLabel: 'Several days (1)', score: 1 },
      { questionId: 'g2', questionText: 'Not being able to stop or control worrying', answerLabel: 'More than half the days (2)', score: 2 },
      { questionId: 'g3', questionText: 'Worrying too much about different things', answerLabel: 'Several days (1)', score: 1 }
    ]
  },
  {
    id: 'SUB-903',
    assessmentId: 'ASS-04',
    assessmentAcronym: 'PHQ-9',
    assessmentTitle: 'Patient Health Questionnaire-9',
    clientId: 'CL-104',
    clientName: 'David Kim',
    therapistName: 'Dr. Alex Harrison',
    completedAt: '2026-08-02 09:40',
    totalScore: 8,
    maxScore: 27,
    severityLabel: 'Mild Depression',
    severityColor: 'bg-amber-500 text-white',
    flaggedRisk: false,
    answers: []
  },
  {
    id: 'SUB-904',
    assessmentId: 'ASS-06',
    assessmentAcronym: 'PCL-5',
    assessmentTitle: 'PTSD Checklist for DSM-5',
    clientId: 'CL-103',
    clientName: 'Emily Rodriguez',
    therapistName: 'Dr. Alex Harrison',
    completedAt: '2026-07-26 16:20',
    totalScore: 24,
    maxScore: 80,
    severityLabel: 'Subthreshold Trauma',
    severityColor: 'bg-emerald-500 text-white',
    flaggedRisk: false,
    answers: []
  },
  {
    id: 'SUB-905',
    assessmentId: 'ASS-05',
    assessmentAcronym: 'GAD-7',
    assessmentTitle: 'Generalized Anxiety Disorder-7',
    clientId: 'CL-105',
    clientName: 'Jessica Taylor',
    therapistName: 'Dr. Alex Harrison',
    completedAt: '2026-07-12 10:05',
    totalScore: 3,
    maxScore: 21,
    severityLabel: 'Minimal Anxiety (Remission)',
    severityColor: 'bg-emerald-500 text-white',
    flaggedRisk: false,
    answers: []
  }
];

export const mockAssignmentsData: AssessmentAssignment[] = [
  {
    id: 'ASN-301',
    assessmentId: 'ASS-04',
    assessmentAcronym: 'PHQ-9',
    assessmentTitle: 'Patient Health Questionnaire-9',
    clientId: 'CL-101',
    clientName: 'Sarah Jenkins',
    therapistName: 'Dr. Alex Harrison',
    assignedDate: '2026-08-01',
    dueDate: '2026-08-08',
    frequency: 'Weekly',
    status: 'Pending'
  },
  {
    id: 'ASN-302',
    assessmentId: 'ASS-05',
    assessmentAcronym: 'GAD-7',
    assessmentTitle: 'Generalized Anxiety Disorder-7',
    clientId: 'CL-102',
    clientName: 'Michael Chen',
    therapistName: 'Dr. Alex Harrison',
    assignedDate: '2026-07-28',
    dueDate: '2026-08-04',
    frequency: 'Bi-weekly',
    status: 'Completed'
  },
  {
    id: 'ASN-303',
    assessmentId: 'ASS-06',
    assessmentAcronym: 'PCL-5',
    assessmentTitle: 'PTSD Checklist for DSM-5',
    clientId: 'CL-103',
    clientName: 'Emily Rodriguez',
    therapistName: 'Dr. Alex Harrison',
    assignedDate: '2026-07-25',
    dueDate: '2026-08-01',
    frequency: 'Monthly',
    status: 'Completed'
  },
  {
    id: 'ASN-304',
    assessmentId: 'ASS-05',
    assessmentAcronym: 'GAD-7',
    assessmentTitle: 'Generalized Anxiety Disorder-7',
    clientId: 'CL-104',
    clientName: 'David Kim',
    therapistName: 'Dr. Alex Harrison',
    assignedDate: '2026-07-31',
    dueDate: '2026-08-05',
    frequency: 'One-time',
    status: 'Pending'
  }
];

export default function Assessments() {
  const currentAuth = getClientAuth();
  const [clientAuthUser, setClientAuthUser] = useState(currentAuth);
  const clientEmail = clientAuthUser?.email?.trim().toLowerCase() || currentAuth?.email?.trim().toLowerCase() || '';
  const clientId = clientAuthUser?.id || (clientAuthUser as any)?._id || currentAuth?.id || (currentAuth as any)?._id || '';
  const clientName = clientAuthUser?.name || currentAuth?.name || currentUserName || 'Client User';

  // Sessions state for accurate 3-session clinical milestone gating
  const [sessions, setSessions] = useState<SessionItem[]>(() => getUserSessions());

  // Main State
  const [assessments, setAssessments] = useState<ClinicalAssessment[]>(mockAssessmentsData);
  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [assignments, setAssignments] = useState<AssessmentAssignment[]>([]);
  const [clientAssignments, setClientAssignments] = useState<AssessmentAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  // Active Navigation Tab: 'library' | 'submissions' | 'assignments'
  const [activeTab, setActiveTab] = useState<'library' | 'submissions' | 'assignments'>('library');

  // Compute completed sessions accurately across live bookings, storage & user profile
  const completedSessionsCount = useMemo(() => {
    const pastCount = sessions.filter(s => 
      s.status === 'past' || 
      (s.scheduledAt && new Date(s.scheduledAt).getTime() < Date.now() - 1000 * 60 * 60)
    ).length;
    const profileCompleted = clientAuthUser?.completedSessionsCount ?? currentAuth?.completedSessionsCount ?? 0;
    const historyCount = clientAuthUser?.sessionHistory?.length ?? currentAuth?.sessionHistory?.length ?? 0;
    return Math.max(pastCount, profileCompleted, historyCount);
  }, [sessions, clientAuthUser, currentAuth]);

  // Load client assignments and scores from Backend API and localStorage
  const loadClientAssignments = React.useCallback(async () => {
    setIsLoadingAssignments(true);
    let remoteAssignments: any[] = [];
    try {
      const q = new URLSearchParams();
      if (clientEmail) q.set('clientEmail', clientEmail);
      if (clientId) q.set('clientId', clientId);
      const res = await fetch(`/api/assessments?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.assignments)) {
          remoteAssignments = data.assignments;
        }
        if (Array.isArray(data.submissions) && data.submissions.length > 0) {
          setSubmissions((prev) => {
            const ids = new Set(data.submissions.map((s: any) => s.id || s._id));
            const filtered = prev.filter((s) => !ids.has(s.id));
            return [...data.submissions, ...filtered];
          });
        }
      }
    } catch (err) {
      console.warn('Could not load remote assessment assignments:', err);
    }

    // The API already matches this client by email or id
    const myAssignments = remoteAssignments
      .filter(Boolean)
      .map((asn: any) => ({ ...asn, status: /^completed$/i.test(String(asn.status || '')) ? 'Completed' : asn.status }));

    setClientAssignments(myAssignments);
    setIsLoadingAssignments(false);
  }, [clientEmail, clientId, clientName]);

  React.useEffect(() => {
    loadClientAssignments();

    const handleSync = () => {
      loadClientAssignments();
      setSessions(getUserSessions());
      setClientAuthUser(getClientAuth());
    };

    window.addEventListener('hexpertify-assignment-created', handleSync);
    window.addEventListener('client_data_updated', handleSync);
    window.addEventListener('auth_state_change', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('hexpertify-assignment-created', handleSync);
      window.removeEventListener('client_data_updated', handleSync);
      window.removeEventListener('auth_state_change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadClientAssignments]);

  // Filter and View States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [activeProtocolModal, setActiveProtocolModal] = useState<ClinicalAssessment | null>(null);
  const [activeRunnerModal, setActiveRunnerModal] = useState<ClinicalAssessment | null>(null);
  const [selectedSubmissionModal, setSelectedSubmissionModal] = useState<AssessmentSubmission | null>(null);
  const [isCreateAssessmentOpen, setIsCreateAssessmentOpen] = useState(false);

  // New Assessment Form State
  const [newTitle, setNewTitle] = useState('');
  const [newAcronym, setNewAcronym] = useState('');
  const [newCategory, setNewCategory] = useState('Anxiety');
  const [newCondition, setNewCondition] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState(5);
  const [newAuthor, setNewAuthor] = useState('Dr. Alex Harrison');
  const [newQuestions, setNewQuestions] = useState<string[]>(['']);
  const [optionScalePreset, setOptionScalePreset] = useState<string>('0-3');
  const [customOptions, setCustomOptions] = useState<string[]>([
    'Not at all',
    'Several days',
    'Over half the days',
    'Nearly every day',
  ]);

  const addQuestionField = () => {
    setNewQuestions([...newQuestions, '']);
  };

  const updateQuestionField = (index: number, text: string) => {
    const updated = [...newQuestions];
    updated[index] = text;
    setNewQuestions(updated);
  };

  const removeQuestionField = (index: number) => {
    if (newQuestions.length <= 1) return;
    setNewQuestions(newQuestions.filter((_, i) => i !== index));
  };

  const addCustomOption = () => {
    setCustomOptions([...customOptions, `Option ${customOptions.length}`]);
  };

  const updateCustomOption = (idx: number, val: string) => {
    const next = [...customOptions];
    next[idx] = val;
    setCustomOptions(next);
  };

  const removeCustomOption = (idx: number) => {
    if (customOptions.length <= 2) return;
    setCustomOptions(customOptions.filter((_, i) => i !== idx));
  };

  const getOptionsForQuestions = (): AssessmentOption[] => {
    if (optionScalePreset === '0-3') {
      return [
        { label: 'Not at all', value: 0 },
        { label: 'Several days', value: 1 },
        { label: 'Over half the days', value: 2 },
        { label: 'Nearly every day', value: 3 },
      ];
    }
    if (optionScalePreset === '0-4') {
      return [
        { label: 'Never', value: 0 },
        { label: 'Almost Never', value: 1 },
        { label: 'Sometimes', value: 2 },
        { label: 'Fairly Often', value: 3 },
        { label: 'Very Often', value: 4 },
      ];
    }
    if (optionScalePreset === 'yes-no') {
      return [
        { label: 'No', value: 0 },
        { label: 'Yes', value: 1 },
      ];
    }
    return customOptions.map((optLabel, i) => ({
      label: optLabel,
      value: i,
    }));
  };

  const handleCreateAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const acronym = newAcronym.trim() || newTitle.slice(0, 4).toUpperCase();
    const validQuestions = newQuestions.filter((q) => q.trim().length > 0);
    const optionsToUse = getOptionsForQuestions();
    
    const questionsList: AssessmentQuestion[] = validQuestions.map((qText, idx) => ({
      id: `q${idx + 1}`,
      text: qText.trim(),
      options: optionsToUse,
    }));

    const created: ClinicalAssessment = {
      id: `ASS-${(assessments.length + 1).toString().padStart(2, '0')}`,
      title: newTitle.trim(),
      acronym,
      questionCount: questionsList.length || 1,
      targetCondition: newCondition.trim() || newCategory,
      category: newCategory,
      timesCompleted: 0,
      type: 'Standard',
      description: newDescription.trim() || `Therapist custom protocol for evaluating ${newTitle.trim()}.`,
      estimatedMinutes: Number(newEstimatedMinutes) || 5,
      validityScore: "Cronbach's α = 0.88",
      targetPopulation: 'Assigned clients',
      authorOrSource: newAuthor.trim() || 'Dr. Alex Harrison',
      status: 'Active',
      assignedClientCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      severityRanges: [
        { minScore: 0, maxScore: 4, label: 'Minimal Symptoms', color: 'bg-emerald-500', clinicalAction: 'Routine monitoring indicated.' },
        { minScore: 5, maxScore: 9, label: 'Mild Symptoms', color: 'bg-amber-500', clinicalAction: 'Review at next follow-up.' },
        { minScore: 10, maxScore: 14, label: 'Moderate Symptoms', color: 'bg-orange-500', clinicalAction: 'Targeted CBT intervention recommended.' },
        { minScore: 15, maxScore: 21, label: 'Severe Elevation', color: 'bg-rose-600', clinicalAction: 'Immediate priority assessment.' },
      ],
      questions: questionsList,
    };

    setAssessments([created, ...assessments]);
    setIsCreateAssessmentOpen(false);
    setNewTitle('');
    setNewAcronym('');
    setNewCondition('');
    setNewDescription('');
    setNewQuestions(['']);
    showToast(`New assessment "${acronym} - ${newTitle}" created successfully!`);
  };

  // Runner Simulator Internal State
  const [runnerCurrentStep, setRunnerCurrentStep] = useState(0);
  const [runnerAnswers, setRunnerAnswers] = useState<Record<string, number>>({});
  const [runnerCompletedReport, setRunnerCompletedReport] = useState<{
    score: number;
    maxScore: number;
    severity: AssessmentSeverityRange | null;
    flagged: boolean;
  } | null>(null);

  // Multi-Step Assignment Modal State (Identical to Activities page)
  const [assignModalAssessment, setAssignModalAssessment] = useState<ClinicalAssessment | null>(null);
  const [assignStep, setAssignStep] = useState<1 | 2>(1);
  const [selectedClientsToAssign, setSelectedClientsToAssign] = useState<string[]>([]);
  const [clientFrequencies, setClientFrequencies] = useState<
    Record<string, { frequency: string; timeOfDay: string }>
  >({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper functions for assignment modal
  const openAssignModal = (assessment: ClinicalAssessment) => {
    setAssignModalAssessment(assessment);
    setAssignStep(1);
    const initialClient = CLIENT_LIST[0] || "Sarah Jenkins";
    setSelectedClientsToAssign([initialClient]);
    setClientFrequencies({
      [initialClient]: { frequency: "Weekly", timeOfDay: "Morning (8:00 AM)" },
    });
  };

  const toggleClientSelection = (clientName: string) => {
    setSelectedClientsToAssign((prev) => {
      const isSelected = prev.includes(clientName);
      let updated: string[];
      if (isSelected) {
        updated = prev.filter((c) => c !== clientName);
      } else {
        updated = [...prev, clientName];
      }
      if (!isSelected && !clientFrequencies[clientName]) {
        setClientFrequencies((fPrev) => ({
          ...fPrev,
          [clientName]: { frequency: "Weekly", timeOfDay: "Morning (8:00 AM)" },
        }));
      }
      return updated;
    });
  };

  const toggleSelectAllClients = () => {
    if (selectedClientsToAssign.length === CLIENT_LIST.length) {
      setSelectedClientsToAssign([CLIENT_LIST[0]]);
    } else {
      setSelectedClientsToAssign([...CLIENT_LIST]);
      const newFreqs: Record<string, { frequency: string; timeOfDay: string }> = {};
      CLIENT_LIST.forEach((c) => {
        newFreqs[c] = clientFrequencies[c] || { frequency: "Weekly", timeOfDay: "Morning (8:00 AM)" };
      });
      setClientFrequencies(newFreqs);
    }
  };

  const applyFrequencyToAll = (freq: string) => {
    setClientFrequencies((prev) => {
      const next = { ...prev };
      selectedClientsToAssign.forEach((c) => {
        next[c] = {
          frequency: freq,
          timeOfDay: next[c]?.timeOfDay || "Morning (8:00 AM)",
        };
      });
      return next;
    });
  };

  const updateClientFrequency = (clientName: string, frequency: string) => {
    setClientFrequencies((prev) => ({
      ...prev,
      [clientName]: {
        frequency,
        timeOfDay: prev[clientName]?.timeOfDay || "Morning (8:00 AM)",
      },
    }));
  };

  const updateClientTimeOfDay = (clientName: string, timeOfDay: string) => {
    setClientFrequencies((prev) => ({
      ...prev,
      [clientName]: {
        frequency: prev[clientName]?.frequency || "Weekly",
        timeOfDay,
      },
    }));
  };

  const handleConfirmAssignment = () => {
    if (!assignModalAssessment || selectedClientsToAssign.length === 0) return;

    const newAssignments: AssessmentAssignment[] = selectedClientsToAssign.map((clientName, idx) => {
      const cfg = clientFrequencies[clientName] || { frequency: "Weekly", timeOfDay: "Morning (8:00 AM)" };
      return {
        id: `ASN-${Date.now().toString().slice(-4)}-${idx}`,
        assessmentId: assignModalAssessment.id,
        assessmentAcronym: assignModalAssessment.acronym,
        assessmentTitle: assignModalAssessment.title,
        clientId: `CL-${100 + idx}`,
        clientName,
        therapistName: "Dr. Alex Harrison",
        assignedDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        frequency: cfg.frequency as any,
        status: "Pending",
      };
    });

    setAssignments((prev) => [...newAssignments, ...prev]);
    setAssignModalAssessment(null);
    setAssignStep(1);
    showToast(
      `Successfully assigned ${assignModalAssessment.acronym} to ${selectedClientsToAssign.length} client(s)!`
    );
  };

  // Submission Filter State
  const [submissionFilter, setSubmissionFilter] = useState<'All' | 'High Risk' | 'Moderate' | 'Mild' | 'Minimal'>('All');

  // Trigger Toast Notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Set of acronyms specifically assigned to this client
  const assignedAcronymsSet = React.useMemo(() => {
    const set = new Set<string>();
    clientAssignments.forEach((asn) => {
      const acronym = asn.assessmentAcronym?.trim().toUpperCase();
      if (acronym) {
        set.add(acronym);
        set.add(acronym.replace(/\s+/g, ''));
      }
    });
    return set;
  }, [clientAssignments]);

  // General assessments are common for ALL clients (PSS-10, WHO-5, WSAS)
  // Specific assessments display in client panel ONLY when the consultant assigns to that client
  const isAssessmentVisibleForClient = React.useCallback(
    (ass: ClinicalAssessment) => {
      const acronym = ass.acronym?.trim().toUpperCase() || '';
      const cleanAcronym = acronym.replace(/\s+/g, '');
      if (GENERAL_ASSESSMENT_ACRONYMS.includes(acronym)) {
        return true;
      }
      return assignedAcronymsSet.has(acronym) || assignedAcronymsSet.has(cleanAcronym);
    },
    [assignedAcronymsSet]
  );

  // Visible assessments sorted strictly by canonical ASSESSMENT_ORDER (1 to 8)
  const visibleAssessments = React.useMemo(() => {
    return assessments
      .filter((ass) => isAssessmentVisibleForClient(ass))
      .sort((a, b) => {
        const idxA = ASSESSMENT_ORDER.indexOf(a.acronym?.trim());
        const idxB = ASSESSMENT_ORDER.indexOf(b.acronym?.trim());
        const rankA = idxA !== -1 ? idxA : 999;
        const rankB = idxB !== -1 ? idxB : 999;
        return rankA - rankB;
      });
  }, [assessments, isAssessmentVisibleForClient]);

  // Helper to determine lock and interval availability status for each assessment
  const getAssessmentAvailability = useCallback((ass: ClinicalAssessment) => {
    const acronym = (ass.acronym || '').trim().toUpperCase();
    const cleanAcronym = acronym.replace(/\s+/g, '');
    const isGeneral = GENERAL_ASSESSMENT_ACRONYMS.includes(acronym) || GENERAL_ASSESSMENT_ACRONYMS.includes(cleanAcronym);

    // Matching assignment from consultant
    const matchingAssignment = clientAssignments.find(
      (asn) =>
        asn.assessmentAcronym?.trim().toUpperCase() === acronym ||
        asn.assessmentAcronym?.trim().replace(/\s+/g, '').toUpperCase() === cleanAcronym
    );

    // Submissions strictly for this logged-in client
    const userSubs = submissions.filter((s) => {
      const sAcronym = (s.assessmentAcronym || '').trim().toUpperCase().replace(/\s+/g, '');
      const matchesAcronym = sAcronym === cleanAcronym || s.assessmentId === ass.id;
      if (!matchesAcronym) return false;
      const sEmail = (s.clientEmail || '').toLowerCase().trim();
      const sId = String(s.clientId || '');
      const sName = (s.clientName || '').toLowerCase().trim();
      return (clientEmail && sEmail === clientEmail) || (clientId && sId === clientId) || (clientName && sName === clientName);
    });

    const latestSubmission = userSubs[0] || null;

    // Profile stored scores
    const authScore = clientAuthUser?.assessmentScores?.find((s) => {
      const sName = (s.name || '').trim().toUpperCase().replace(/\s+/g, '');
      return sName === cleanAcronym;
    });

    const hasSubmission = Boolean(latestSubmission || authScore || matchingAssignment?.status === 'Completed');
    const lastScore = latestSubmission?.totalScore ?? authScore?.score;
    const maxScore = latestSubmission?.maxScore ?? authScore?.maxScore ?? (ass.questionCount * (ass.acronym === 'PHQ-9' ? 3 : ass.acronym === 'PSS-10' ? 4 : 3));
    const lastSeverity = latestSubmission?.severityLabel || authScore?.severity || 'Evaluated';

    let IconComponent = Brain;
    let iconBgClass = 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    let categoryColor = 'text-[#5e2be2] dark:text-purple-400 font-extrabold';

    if (acronym.includes('WHO')) {
      IconComponent = Activity;
      iconBgClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      categoryColor = 'text-emerald-600 dark:text-emerald-400 font-extrabold';
    } else if (acronym.includes('PSS')) {
      IconComponent = TrendingUp;
      iconBgClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      categoryColor = 'text-blue-600 dark:text-blue-400 font-extrabold';
    } else if (acronym.includes('WSAS')) {
      IconComponent = Sparkles;
      iconBgClass = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
      categoryColor = 'text-indigo-600 dark:text-indigo-400 font-extrabold';
    } else if (acronym.includes('GAD')) {
      IconComponent = Brain;
      iconBgClass = 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      categoryColor = 'text-purple-600 dark:text-purple-400 font-extrabold';
    } else if (acronym.includes('PHQ')) {
      IconComponent = ShieldCheck;
      iconBgClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
      categoryColor = 'text-rose-600 dark:text-rose-400 font-extrabold';
    } else {
      IconComponent = ShieldCheck;
      iconBgClass = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
      categoryColor = 'text-indigo-600 dark:text-indigo-400 font-extrabold';
    }

    if (isGeneral) {
      // General assessment (PSS-10, WHO-5, WSAS)
      // Once completed, it is greyed out until 3rd session milestone
      if (hasSubmission) {
        if (completedSessionsCount < 3) {
          return {
            isLocked: true,
            lockType: 'general' as const,
            IconComponent,
            iconBgClass,
            categoryColor,
            milestoneHeading: 'Evaluated at Session 3',
            milestoneSubtext: lastScore !== undefined
              ? `Completed baseline (${lastScore}/${maxScore} · ${lastSeverity}). Stress & progress trajectory updates at Session 3.`
              : 'Baseline completed. Progress trajectory updates automatically after your 3rd therapy session.',
            intervalTag: '3-Session Intervals',
            buttonLabel: `Completed · Locked until Session 3`,
            tableStatusBadge: `Locked (Session 3)`,
            tableButtonLabel: `Session 3`,
            latestSubmission,
            lastScore,
            maxScore,
            lastSeverity,
          };
        } else {
          // >= 3 sessions: unlocked for milestone check-in
          return {
            isLocked: false,
            lockType: 'unlocked' as const,
            IconComponent,
            iconBgClass,
            categoryColor,
            milestoneHeading: 'Session 3 Milestone Active',
            milestoneSubtext: 'Ready for outcome re-evaluation check-in.',
            intervalTag: '3-Session Intervals',
            buttonLabel: 'Play Assessment',
            tableStatusBadge: 'Milestone Active',
            tableButtonLabel: 'Play',
            latestSubmission,
            lastScore,
            maxScore,
            lastSeverity,
          };
        }
      } else {
        // Unattempted baseline
        return {
          isLocked: false,
          lockType: 'unlocked' as const,
          IconComponent,
          iconBgClass,
          categoryColor,
          milestoneHeading: 'Intake Baseline Screener',
          milestoneSubtext: 'Complete your initial baseline assessment.',
          intervalTag: '3-Session Intervals',
          buttonLabel: 'Play Assessment',
          tableStatusBadge: 'Baseline',
          tableButtonLabel: 'Play',
          latestSubmission: null,
          lastScore: undefined,
          maxScore,
          lastSeverity: undefined,
        };
      }
    } else {
      // Assigned Assessment (e.g. GAD-7, PHQ-9, PCL-5, etc.)
      const freq = matchingAssignment?.frequency || 'Weekly';

      if (hasSubmission) {
        if (freq === 'One-time') {
          return {
            isLocked: true,
            lockType: 'assigned_onetime' as const,
            IconComponent,
            iconBgClass,
            categoryColor,
            milestoneHeading: 'Attempt Completed',
            milestoneSubtext: lastScore !== undefined
              ? `Submitted score: ${lastScore}/${maxScore} (${lastSeverity}). Single-attempt screener completed.`
              : 'Single-attempt screener completed and recorded in your chart.',
            intervalTag: '1-Time Screener',
            buttonLabel: 'Attempt Completed',
            tableStatusBadge: 'Completed',
            tableButtonLabel: 'Completed',
            latestSubmission,
            lastScore,
            maxScore,
            lastSeverity,
          };
        } else if (freq === 'As Needed' || freq === 'As Needed (PRN)') {
          return {
            isLocked: false,
            lockType: 'unlocked' as const,
            IconComponent,
            iconBgClass,
            categoryColor,
            milestoneHeading: 'As Needed',
            milestoneSubtext: 'Available for self-assessment as needed.',
            intervalTag: 'As Needed',
            buttonLabel: 'Play Assessment',
            tableStatusBadge: 'As Needed',
            tableButtonLabel: 'Play',
            latestSubmission,
            lastScore,
            maxScore,
            lastSeverity,
          };
        } else {
          // Recurring interval calculation
          let intervalDays = 7;
          if (freq === 'Daily') intervalDays = 1;
          else if (freq === '2-3 Times / Week') intervalDays = 2.5;
          else if (freq === 'Weekly') intervalDays = 7;
          else if (freq === 'Bi-weekly') intervalDays = 14;
          else if (freq === 'Monthly') intervalDays = 30;

          const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

          let lastCompletedMs = Date.now() - 3600000;
          if (latestSubmission?.completedAt) {
            const parsed = new Date(latestSubmission.completedAt).getTime();
            if (!isNaN(parsed)) lastCompletedMs = parsed;
          } else if (authScore?.date) {
            const parsed = new Date(authScore.date).getTime();
            if (!isNaN(parsed)) lastCompletedMs = parsed;
          } else if (matchingAssignment?.assignedDate) {
            const parsed = new Date(matchingAssignment.assignedDate).getTime();
            if (!isNaN(parsed)) lastCompletedMs = parsed;
          }

          let nextAvailableMs = lastCompletedMs + intervalMs;
          if (matchingAssignment?.dueDate) {
            const dueMs = new Date(matchingAssignment.dueDate).getTime();
            if (!isNaN(dueMs) && dueMs > lastCompletedMs) {
              nextAvailableMs = Math.max(nextAvailableMs, dueMs);
            }
          }

          const now = Date.now();
          if (now < nextAvailableMs) {
            const dateFormatted = new Date(nextAvailableMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return {
              isLocked: true,
              lockType: 'assigned_interval' as const,
              IconComponent,
              iconBgClass,
              categoryColor,
              milestoneHeading: 'Evaluated for Next Interval',
              milestoneSubtext: lastScore !== undefined
                ? `Completed (${lastScore}/${maxScore} · ${lastSeverity}). Next evaluation available on ${dateFormatted}.`
                : `Evaluation completed. Next assigned check-in unlocks on ${dateFormatted}.`,
              intervalTag: `${freq}`,
              buttonLabel: `Completed · Available ${dateFormatted}`,
              tableStatusBadge: `Next: ${dateFormatted}`,
              tableButtonLabel: `Next: ${dateFormatted}`,
              latestSubmission,
              lastScore,
              maxScore,
              lastSeverity,
              nextAvailableDate: dateFormatted,
            };
          } else {
            // Interval has arrived! Unlocked for next check-in
            return {
              isLocked: false,
              lockType: 'unlocked' as const,
              IconComponent,
              iconBgClass,
              categoryColor,
              milestoneHeading: 'Due for Next Interval Check-in',
              milestoneSubtext: `Your ${freq} check-in is now ready to begin.`,
              intervalTag: `${freq}`,
              buttonLabel: 'Play Assessment',
              tableStatusBadge: 'Due Now',
              tableButtonLabel: 'Play',
              latestSubmission,
              lastScore,
              maxScore,
              lastSeverity,
            };
          }
        }
      } else {
        // First attempt pending
        return {
          isLocked: false,
          lockType: 'unlocked' as const,
          IconComponent,
          iconBgClass,
          categoryColor,
          milestoneHeading: 'Assigned by Consultant',
          milestoneSubtext: matchingAssignment?.dueDate
            ? `Due for submission by ${matchingAssignment.dueDate}.`
            : 'Ready for your initial screening evaluation.',
          intervalTag: `${freq}`,
          buttonLabel: 'Play Assessment',
          tableStatusBadge: 'Assigned',
          tableButtonLabel: 'Play',
          latestSubmission: null,
          lastScore: undefined,
          maxScore,
          lastSeverity: undefined,
        };
      }
    }
  }, [clientAssignments, submissions, clientAuthUser, completedSessionsCount]);

  // Check if all general baseline assessments are completed strictly for this client
  const allGeneralCompleted = React.useMemo(() => {
    return GENERAL_ASSESSMENT_ACRONYMS.every((acronym) => {
      const clean = acronym.replace(/\s+/g, '');
      const subExists = submissions.some((s) => {
        const sAcronym = (s.assessmentAcronym || '').trim().toUpperCase().replace(/\s+/g, '');
        if (sAcronym !== clean) return false;
        const sEmail = (s.clientEmail || '').toLowerCase().trim();
        const sId = String(s.clientId || '');
        const sName = (s.clientName || '').toLowerCase().trim();
        return (clientEmail && sEmail === clientEmail) || (clientId && sId === clientId) || (clientName && sName === clientName);
      });
      const authExists = clientAuthUser?.assessmentScores?.some((s) => (s.name || '').trim().toUpperCase().replace(/\s+/g, '') === clean);
      return subExists || authExists;
    });
  }, [submissions, clientAuthUser, clientEmail, clientId, clientName]);

  // Filtered Assessments Library (respecting search, category, and type)
  const filteredAssessments = visibleAssessments.filter((ass) => {
    const matchesSearch =
      ass.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ass.acronym.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ass.targetCondition.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ass.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || ass.category === selectedCategory;
    const matchesType = selectedType === 'All' || ass.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  // Filtered Submissions
  const filteredSubmissions = submissions.filter((sub) => {
    if (submissionFilter === 'All') return true;
    if (submissionFilter === 'High Risk') return sub.flaggedRisk || sub.severityLabel.toLowerCase().includes('severe');
    if (submissionFilter === 'Moderate') return sub.severityLabel.toLowerCase().includes('moderate');
    if (submissionFilter === 'Mild') return sub.severityLabel.toLowerCase().includes('mild');
    if (submissionFilter === 'Minimal') return sub.severityLabel.toLowerCase().includes('minimal');
    return true;
  });

  // Interactive Test Simulator Runner
  const handleOpenRunner = (assessment: ClinicalAssessment) => {
    const status = getAssessmentAvailability(assessment);
    if (status.isLocked) {
      showToast(status.buttonLabel);
      return;
    }

    let questionsToUse = assessment.questions;
    if (!questionsToUse || questionsToUse.length === 0) {
      questionsToUse = Array.from({ length: assessment.questionCount || 5 }).map((_, idx) => ({
        id: `gen_${idx + 1}`,
        text: `Item #${idx + 1}: Rate symptom severity for ${assessment.targetCondition}`,
        subtext: 'Over the last 2 weeks, how frequently have you been affected?',
        options: [
          { label: 'Not at all (0)', value: 0 },
          { label: 'Several days (1)', value: 1 },
          { label: 'More than half the days (2)', value: 2 },
          { label: 'Nearly every day (3)', value: 3 }
        ],
        isRiskTrigger: idx === assessment.questionCount - 1
      }));
    }
    const fullAssessmentObj = { ...assessment, questions: questionsToUse };
    setActiveRunnerModal(fullAssessmentObj);
    setRunnerCurrentStep(0);
    setRunnerAnswers({});
    setRunnerCompletedReport(null);
  };

  const calculateResultsWithAnswers = (answersMap: Record<string, number>) => {
    if (!activeRunnerModal || !activeRunnerModal.questions) return;
    let score = 0;
    let flagged = false;

    activeRunnerModal.questions.forEach((q) => {
      const selectedVal = answersMap[q.id] !== undefined ? answersMap[q.id] : 0;
      score += selectedVal;
      if (q.isRiskTrigger && selectedVal > 0) {
        flagged = true;
      }
    });

    const maxScore = activeRunnerModal.questions.reduce((acc, q) => {
      const maxOpt = Math.max(...q.options.map((o) => o.value));
      return acc + maxOpt;
    }, 0);

    let matchedSeverity: AssessmentSeverityRange | null = null;
    if (activeRunnerModal.severityRanges && activeRunnerModal.severityRanges.length > 0) {
      matchedSeverity =
        activeRunnerModal.severityRanges.find((r) => score >= r.minScore && score <= r.maxScore) ||
        activeRunnerModal.severityRanges[activeRunnerModal.severityRanges.length - 1];
    } else {
      const ratio = score / (maxScore || 1);
      if (ratio < 0.25) matchedSeverity = { minScore: 0, maxScore: 5, label: 'Minimal / Low Risk', color: 'bg-emerald-500', clinicalAction: 'No immediate action required.' };
      else if (ratio < 0.5) matchedSeverity = { minScore: 6, maxScore: 10, label: 'Mild Symptom Elevation', color: 'bg-amber-500', clinicalAction: 'Monitor and review at next follow-up.' };
      else if (ratio < 0.75) matchedSeverity = { minScore: 11, maxScore: 15, label: 'Moderate Symptoms', color: 'bg-orange-500', clinicalAction: 'Consider targeted CBT or intervention.' };
      else matchedSeverity = { minScore: 16, maxScore: 30, label: 'Severe Elevation', color: 'bg-rose-600', clinicalAction: 'Immediate priority assessment indicated.' };
    }

    setRunnerCompletedReport({
      score,
      maxScore,
      severity: matchedSeverity,
      flagged
    });

    const userAuth = getClientAuth();
    const assignedTherapistId = userAuth?.assignedTherapistId || '';
    const assignedTherapistName = userAuth?.assignedTherapistName || '';
    const assignedTherapistEmail = userAuth?.assignedTherapistEmail || '';
    const normalizedAcronym = activeRunnerModal.acronym.trim().toUpperCase().replace(/\s+/g, '');
    const pendingAssignment = clientAssignments.find((asn) =>
      String(asn.status || '').toLowerCase() === 'pending' &&
      asn.assessmentAcronym?.trim().toUpperCase().replace(/\s+/g, '') === normalizedAcronym
    );

    // Save score to submissions state and Backend API
    const newSubmission: AssessmentSubmission = {
      id: `SUB-${Date.now().toString().slice(-4)}`,
      assessmentId: activeRunnerModal.id,
      assessmentAcronym: activeRunnerModal.acronym,
      assessmentTitle: activeRunnerModal.title,
      clientId,
      clientName,
      clientEmail: clientEmail || '',
      therapistName: assignedTherapistName,
      completedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      totalScore: score,
      maxScore,
      severityLabel: matchedSeverity?.label || 'Evaluated',
      severityColor: matchedSeverity?.color || 'bg-[#5e2be2] text-white',
      flaggedRisk: flagged,
      answers: Object.entries(answersMap).map(([qId, val]) => {
        const question = activeRunnerModal.questions?.find((q) => q.id === qId);
        // The option the client picked, without the "(n)" score suffix; scales like ASRS give two options the same score
        const labels = (question?.options || [])
          .filter((o) => o.value === val)
          .map((o) => String(o.label).replace(/\s*\(\d+\)\s*$/, '').trim());
        return {
          questionId: qId,
          questionText: question?.text || qId,
          answerLabel: labels.length ? labels.join(' / ') : String(val),
          score: val,
        };
      }),
    };

    setSubmissions((prev) => [newSubmission, ...prev]);


    // Update local client auth with assessment score
    if (userAuth) {
      const prevScores = Array.isArray(userAuth.assessmentScores) ? userAuth.assessmentScores : [];
      const updatedScores = [
        ...prevScores.filter((s) => s.name !== activeRunnerModal.acronym),
        {
          name: activeRunnerModal.acronym,
          score,
          maxScore,
          date: new Date().toISOString().split('T')[0],
          severity: matchedSeverity?.label || 'Evaluated'
        }
      ];
      const updatedAuth = {
        ...userAuth,
        assessmentScores: updatedScores
      };
      setClientAuth(updatedAuth);
      setClientAuthUser(updatedAuth);
    }

    // Trigger local events for immediate reactive state updates
    window.dispatchEvent(new Event('client_data_updated'));

    fetch('/api/assessments/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId: pendingAssignment?.id,
        assessmentId: activeRunnerModal.id,
        assessmentAcronym: activeRunnerModal.acronym,
        assessmentTitle: activeRunnerModal.title,
        clientId,
        clientName,
        clientEmail,
        consultantId: assignedTherapistId,
        consultantName: assignedTherapistName,
        consultantEmail: assignedTherapistEmail,
        therapistName: assignedTherapistName,
        totalScore: score,
        score,
        maxScore,
        severity: matchedSeverity?.label,
        severityLabel: matchedSeverity?.label,
        severityColor: matchedSeverity?.color,
        flaggedRisk: flagged,
        answers: newSubmission.answers,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // The server marked the matching assignment Completed: show its state
        return loadClientAssignments();
      })
      .catch((err) => console.warn('Could not post score to API:', err));
  };

  const handleRunnerSelectAnswer = (qId: string, val: number) => {
    setRunnerAnswers((prev) => ({ ...prev, [qId]: val }));

    // Auto-advance to the next question. The last question waits for "Finish & Score".
    const totalQuestions = activeRunnerModal?.questions?.length ?? 0;
    const answeredStep = runnerCurrentStep;
    if (answeredStep < totalQuestions - 1) {
      setTimeout(() => {
        setRunnerCurrentStep((currentStep) => (currentStep === answeredStep ? currentStep + 1 : currentStep));
      }, 250);
    }
  };

  return (
    <div className="space-y-6 pb-16 w-full">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#5e2be2] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top border border-purple-300">
          <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
          <span className="font-extrabold text-xs tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Assessments"
        description="Monitor standardized scale responses (PHQ-9, GAD-7, PSS-10, PCL-5), track patient risk safety alerts, and evaluate progress."
      />



      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by acronym, condition, title..."
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 px-3 py-1.5 outline-none focus:border-[#5e2be2]"
            >
              <option value="All">All Categories</option>
              <option value="Stress">1. Stress (PSS-10)</option>
              <option value="Well-Being">2. Well-Being (WHO-5)</option>
              <option value="Functioning">3. Functioning (WSAS)</option>
              <option value="Depression">4. Depression (PHQ-9)</option>
              <option value="Anxiety">5. Anxiety (GAD-7)</option>
              <option value="PTSD">6. PTSD (PCL-5)</option>
              <option value="OCD">7. OCD (OCI-R)</option>
              <option value="ADHD">8. ADHD (ASRS v1.1)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto p-1 max-w-full no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all bg-[#5e2be2] text-white shadow-md"
          >
            <Layers className="w-4 h-4" />
            <span>Assessment Library ({filteredAssessments.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SCREENER LIBRARY */}
      {activeTab === 'library' && (
        <div className="space-y-6">

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAssessments.map((ass) => {
                const isGeneral = GENERAL_ASSESSMENT_ACRONYMS.includes(ass.acronym.trim().toUpperCase());
                const matchingAssignment = clientAssignments.find(
                  (asn) =>
                    asn.assessmentAcronym?.trim().toUpperCase() === ass.acronym.trim().toUpperCase() ||
                    asn.assessmentAcronym?.trim().replace(/\s+/g, '').toUpperCase() === ass.acronym.trim().replace(/\s+/g, '').toUpperCase()
                );
                const status = getAssessmentAvailability(ass);

                return (
                  <div
                    key={ass.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 bg-purple-50 text-[#5e2be2] font-black text-xs rounded-lg border border-purple-100">
                            {ass.acronym}
                          </span>
                          {isGeneral ? (
                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded-full border border-blue-200 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-blue-600" />
                              General
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-full border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Assigned by Consultant
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {ass.questionCount} Items · {ass.estimatedMinutes || 4} mins
                        </span>
                      </div>

                      <h3
                        onClick={() => setActiveProtocolModal(ass)}
                        className="font-extrabold text-slate-900 text-base group-hover:text-[#5e2be2] transition-colors cursor-pointer"
                      >
                        {ass.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {ass.description}
                      </p>

                      {matchingAssignment && (
                        <div className="mt-3 px-3 py-1.5 bg-purple-50/70 border border-purple-100 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                          <span className="font-semibold text-slate-700">
                            By {matchingAssignment.therapistName || (matchingAssignment as any).consultantName || 'Consultant'}
                          </span>
                          <span className="font-bold text-[#5e2be2]">
                            Due: {matchingAssignment.dueDate || 'Check-in'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                      {status.isLocked ? (
                        <button
                          type="button"
                          disabled={true}
                          title={status.buttonLabel}
                          className="inline-flex items-center justify-center whitespace-nowrap min-h-9 px-4 py-2 w-full h-11 rounded-2xl bg-slate-200 text-slate-400 border border-slate-300 font-bold text-sm cursor-not-allowed shadow-none gap-2 select-none"
                        >
                          <Play className="w-4 h-4 fill-slate-400 text-slate-400" />
                          <span>Play Assessment</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRunner(ass)}
                          className="inline-flex items-center justify-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2 border border-primary-border min-h-9 px-4 py-2 w-full h-11 rounded-2xl bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-sm transition-all duration-200 cursor-pointer shadow-md shadow-purple-500/20 gap-2"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Play Assessment</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Instrument</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Target Condition</th>
                    <th className="py-4 px-6">Items &amp; Time</th>
                    <th className="py-4 px-6">Completions</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssessments.map((ass) => {
                    const isGeneral = GENERAL_ASSESSMENT_ACRONYMS.includes(ass.acronym.trim().toUpperCase());
                    const status = getAssessmentAvailability(ass);
                    return (
                      <tr key={ass.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 bg-purple-50 text-[#5e2be2] font-black text-xs rounded-lg border border-purple-100">
                              {ass.acronym}
                            </span>
                            <div>
                              <span className="font-bold text-slate-900 text-sm block">{ass.title}</span>
                              <span className="text-xs text-slate-400">{ass.authorOrSource || 'Standard'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {isGeneral ? (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-extrabold text-[11px] rounded-full border border-blue-200 inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-blue-600" /> General
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-[11px] rounded-full border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Assigned
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-700 text-xs">{ass.targetCondition}</td>
                        <td className="py-4 px-6 text-xs text-slate-600 font-medium">
                          {ass.questionCount} Questions ({ass.estimatedMinutes || 4} mins)
                        </td>
                        <td className="py-4 px-6 text-xs font-bold text-emerald-600">{ass.timesCompleted} evaluated</td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {status.isLocked ? (
                              <button
                                type="button"
                                disabled={true}
                                title={status.tableButtonLabel}
                                className="px-3.5 py-2 bg-slate-200 text-slate-400 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-300 cursor-not-allowed select-none"
                              >
                                <Play className="w-3.5 h-3.5 fill-slate-400 text-slate-400" />
                                <span>Play</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenRunner(ass)}
                                className="px-3.5 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                              >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Play</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setActiveProtocolModal(ass)}
                              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors cursor-pointer"
                              title="Preview Exercise Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBMISSIONS LOG */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Severity:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['All', 'High Risk', 'Moderate', 'Mild', 'Minimal'] as const).map((filterVal) => (
                  <button
                    key={filterVal}
                    type="button"
                    onClick={() => setSubmissionFilter(filterVal)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                      submissionFilter === filterVal
                        ? 'bg-[#5e2be2] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filterVal}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs font-bold text-slate-400">
              Showing {filteredSubmissions.length} evaluation logs
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Client</th>
                  <th className="py-4 px-6">Instrument</th>
                  <th className="py-4 px-6">Score &amp; Severity</th>
                  <th className="py-4 px-6">Safety Risk</th>
                  <th className="py-4 px-6">Completed Date</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 text-sm whitespace-nowrap">{sub.clientName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-extrabold text-xs rounded-md border border-slate-200">
                        {sub.assessmentAcronym}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-black text-slate-900 text-base">{sub.totalScore}/{sub.maxScore}</span>
                    </td>
                    <td className="py-4 px-6">
                      {sub.flaggedRisk ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-800 rounded-md font-black text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> High Risk Alert
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Normal
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-600 font-semibold">{sub.completedAt}</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedSubmissionModal(sub)}
                        className="px-3 py-1.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-xl transition-colors"
                      >
                        View Answers
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CLIENT ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Client</th>
                  <th className="py-4 px-6">Assigned Screener</th>
                  <th className="py-4 px-6">Frequency</th>
                  <th className="py-4 px-6">Due Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientAssignments.map((asn) => (
                  <tr key={asn.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 text-sm whitespace-nowrap">{asn.clientName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 bg-purple-50 text-[#5e2be2] font-black text-xs rounded-md border border-purple-100">
                        {asn.assessmentAcronym}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-700 text-xs">{asn.frequency}</td>
                    <td className="py-4 px-6 font-semibold text-slate-700 text-xs">{asn.dueDate}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold ${
                        asn.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {asn.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          showToast(`Reminder sent to ${asn.clientName}!`);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                      >
                        Remind
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Protocol Details Modal */}
      {activeProtocolModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] my-auto">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-[#5e2be2] text-white font-mono font-extrabold text-xs rounded-lg">
                  {activeProtocolModal.acronym}
                </span>
                <div>
                  <h3 className="font-extrabold text-lg">{activeProtocolModal.title}</h3>
                  <p className="text-xs text-slate-400">Protocol &amp; Scoring Rules</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveProtocolModal(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {/* Meta Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block font-semibold">Target Condition</span>
                  <span className="font-extrabold text-slate-900 text-sm">{activeProtocolModal.targetCondition}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Validation Norms</span>
                  <span className="font-extrabold text-purple-700 text-sm">{activeProtocolModal.validityScore || "Standardized"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Source / Author</span>
                  <span className="font-extrabold text-slate-800">{activeProtocolModal.authorOrSource || "Published Literature"}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 mb-1">Scope &amp; Guidelines</h4>
                <p className="text-slate-600 leading-relaxed font-medium">{activeProtocolModal.description}</p>
              </div>

              {/* Severity Cutoff Table */}
              {activeProtocolModal.severityRanges && activeProtocolModal.severityRanges.length > 0 && (
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-2">Score Thresholds &amp; Cutoffs</h4>
                  <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <tr>
                          <th className="p-3">Score Range</th>
                          <th className="p-3">Severity Level</th>
                          <th className="p-3">Action Plan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeProtocolModal.severityRanges.map((range, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-extrabold text-slate-900">
                              {range.minScore} - {range.maxScore} pts
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-full text-white font-extrabold text-[10px] ${range.color}`}>
                                {range.label}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 font-semibold">{range.clinicalAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Itemized Questions & Response Options List */}
              {activeProtocolModal.questions && activeProtocolModal.questions.length > 0 && (
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-2">
                    Standardized Assessment Questions ({activeProtocolModal.questions.length} Items)
                  </h4>
                  <div className="space-y-3">
                    {activeProtocolModal.questions.map((q, idx) => (
                      <div key={q.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-extrabold text-slate-900 text-xs leading-snug">
                            {idx + 1}. {q.text}
                          </span>
                          {q.isRiskTrigger && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-extrabold text-[10px] rounded-md shrink-0 border border-rose-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Safety Trigger
                            </span>
                          )}
                        </div>
                        {q.subtext && (
                          <p className="text-[11px] text-[#5e2be2] font-semibold">{q.subtext}</p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {q.options.map((opt, oIdx) => (
                            <span key={oIdx} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-medium shadow-2xs">
                              {cleanOptionLabel(opt.label)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const target = activeProtocolModal;
                  setActiveProtocolModal(null);
                  handleOpenRunner(target);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Launch Live Simulator</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveProtocolModal(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Close Protocol
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Test Simulator Runner Modal */}
      {activeRunnerModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] my-auto">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#4f28d9] to-[#5e2be2] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white font-mono font-extrabold text-xs rounded-lg border border-white/20">
                  {activeRunnerModal.acronym}
                </span>
                <div>
                  <h3 className="font-extrabold text-lg leading-tight">{activeRunnerModal.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveRunnerModal(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {!runnerCompletedReport ? (
                <>
                  {/* Progress Indicator */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Question {runnerCurrentStep + 1} of {activeRunnerModal.questions?.length || 1}</span>
                      <span>
                        {Math.round((runnerCurrentStep / (activeRunnerModal.questions?.length || 1)) * 100)}% Complete
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#5e2be2] transition-all duration-300"
                        style={{
                          width: `${(runnerCurrentStep / (activeRunnerModal.questions?.length || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Active Question Card */}
                  {activeRunnerModal.questions && activeRunnerModal.questions[runnerCurrentStep] && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                        {activeRunnerModal.questions[runnerCurrentStep].isRiskTrigger && (
                          <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 font-extrabold text-[10px] rounded-md flex items-center gap-1 w-fit border border-rose-200">
                            <AlertTriangle className="w-3 h-3" /> Safety Trigger Question
                          </span>
                        )}
                        <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                          {activeRunnerModal.questions[runnerCurrentStep].text}
                        </h4>
                        {activeRunnerModal.questions[runnerCurrentStep].subtext && (
                          <p className="text-xs text-slate-500 font-medium">
                            {activeRunnerModal.questions[runnerCurrentStep].subtext}
                          </p>
                        )}
                      </div>

                      {/* Options Radio List */}
                      <div className="space-y-2.5">
                        {activeRunnerModal.questions[runnerCurrentStep].options.map((opt) => {
                          const currentQId = activeRunnerModal.questions![runnerCurrentStep].id;
                          const isSelected = runnerAnswers[currentQId] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleRunnerSelectAnswer(currentQId, opt.value)}
                              className={`w-full p-4 rounded-2xl border text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-50 border-[#5e2be2] text-[#5e2be2] shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{cleanOptionLabel(opt.label)}</span>
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                  isSelected ? 'border-[#5e2be2] bg-[#5e2be2] text-white' : 'border-slate-300'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Completed Report */
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-4 text-center">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-extrabold text-purple-300">
                      Calculated Outcome
                    </span>
                    <div className="space-y-1">
                      <div className="text-4xl font-extrabold">
                        {runnerCompletedReport.score}{' '}
                        <span className="text-xl text-slate-400 font-normal">/ {runnerCompletedReport.maxScore}</span>
                      </div>
                      <span
                        className={`inline-block px-4 py-1.5 rounded-full font-extrabold text-xs text-white ${
                          runnerCompletedReport.severity?.color || 'bg-purple-600'
                        }`}
                      >
                        {runnerCompletedReport.severity?.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                      <strong>Recommended Action:</strong> {runnerCompletedReport.severity?.clinicalAction}
                    </p>
                  </div>
                  {runnerCompletedReport.flagged && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-900 text-xs font-semibold">
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>
                        <strong>Safety Trigger Alert:</strong> One or more high-risk safety items were flagged during this assessment. Immediate safety evaluation is recommended.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Controls */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {!runnerCompletedReport ? (
                <>
                  <button
                    type="button"
                    disabled={runnerCurrentStep === 0}
                    onClick={() => setRunnerCurrentStep((prev) => Math.max(0, prev - 1))}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={
                      !activeRunnerModal.questions ||
                      runnerAnswers[activeRunnerModal.questions[runnerCurrentStep]?.id] === undefined
                    }
                    onClick={() => {
                      if (!activeRunnerModal.questions) return;
                      if (runnerCurrentStep < activeRunnerModal.questions.length - 1) {
                        setRunnerCurrentStep((prev) => prev + 1);
                      } else {
                        calculateResultsWithAnswers(runnerAnswers);
                      }
                    }}
                    className="px-6 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>
                      {activeRunnerModal.questions && runnerCurrentStep === activeRunnerModal.questions.length - 1
                        ? 'Finish & Score'
                        : 'Next Item'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveRunnerModal(null)}
                  className="w-full py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
                >
                  Close Simulator
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Assign Assessment & Select Frequency Multi-Step Modal */}
      {assignModalAssessment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-5">
            {/* Header with Step Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {assignStep === 1 ? "1. Select Client(s)" : "2. Select Assessment Frequency"}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {assignStep === 1
                    ? `Choose which client(s) will receive "${assignModalAssessment.title}".`
                    : `Configure individual assessment frequencies for each assigned client.`}
                </p>
              </div>
              <span className="text-xs font-extrabold text-[#5e2be2] bg-purple-50 px-3 py-1 rounded-full border border-purple-100 shrink-0">
                Step {assignStep} of 2
              </span>
            </div>

            {/* STEP 1: Select Client(s) */}
            {assignStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Clients ({selectedClientsToAssign.length} selected)
                  </span>
                  <button
                    type="button"
                    onClick={toggleSelectAllClients}
                    className="text-xs font-bold text-[#5e2be2] hover:underline cursor-pointer"
                  >
                    {selectedClientsToAssign.length === CLIENT_LIST.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {CLIENT_LIST.map((client) => {
                    const isChecked = selectedClientsToAssign.includes(client);
                    return (
                      <div
                        key={client}
                        onClick={() => toggleClientSelection(client)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-purple-50/80 border-[#5e2be2]/40 text-[#5e2be2] font-semibold"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                              isChecked
                                ? "bg-[#5e2be2] border-[#5e2be2] text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className="text-sm font-semibold">{client}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Configure Per-Client Frequency & Schedule */}
            {assignStep === 2 && (
              <div className="space-y-4">
                {/* Bulk Shortcut Bar */}
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Quick Bulk Apply:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {["Daily", "2-3 Times / Week", "Weekly", "As Needed"].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => applyFrequencyToAll(f)}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white hover:bg-purple-50 text-slate-700 hover:text-[#5e2be2] border border-slate-200 hover:border-[#5e2be2]/30 transition-colors cursor-pointer"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Per-Client Frequency Configuration List */}
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {selectedClientsToAssign.map((clientName) => {
                    const currentConfig = clientFrequencies[clientName] || {
                      frequency: "Weekly",
                      timeOfDay: "Morning (8:00 AM)",
                    };
                    const initials = clientName
                      .split(" ")
                      .map((n) => n[0])
                      .join("");

                    return (
                      <div
                        key={clientName}
                        className="p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:border-purple-200 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-[#5e2be2] font-bold flex items-center justify-center text-xs shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 leading-tight">{clientName}</p>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Individual Schedule</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-[#5e2be2] border border-purple-100">
                            {currentConfig.frequency}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Frequency
                            </label>
                            <select
                              value={currentConfig.frequency}
                              onChange={(e) => updateClientFrequency(clientName, e.target.value)}
                              className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#5e2be2] focus:outline-none"
                            >
                              {FREQUENCY_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Preferred Time
                            </label>
                            <select
                              value={currentConfig.timeOfDay}
                              onChange={(e) => updateClientTimeOfDay(clientName, e.target.value)}
                              className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#5e2be2] focus:outline-none"
                            >
                              {TIME_OPTIONS.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <button
                type="button"
                onClick={() => {
                  setAssignModalAssessment(null);
                  setAssignStep(1);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {assignStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setAssignStep(1)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                  >
                    Back
                  </button>
                )}

                {assignStep === 1 ? (
                  <button
                    type="button"
                    disabled={selectedClientsToAssign.length === 0}
                    onClick={() => setAssignStep(2)}
                    className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next: Configure Schedule</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmAssignment}
                    className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirm Assignment</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submission Breakdown Modal */}
      {selectedSubmissionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-7 max-w-xl w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2 py-0.5 bg-purple-50 text-[#5e2be2] font-black text-xs rounded-md">
                  {selectedSubmissionModal.assessmentAcronym}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{selectedSubmissionModal.clientName}</h3>
                <span className="text-xs text-slate-400 font-medium">Completed on {selectedSubmissionModal.completedAt}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmissionModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Evaluation Score</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {selectedSubmissionModal.totalScore} / {selectedSubmissionModal.maxScore}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-md text-xs font-extrabold ${selectedSubmissionModal.severityColor}`}>
                {selectedSubmissionModal.severityLabel}
              </span>
            </div>

            {selectedSubmissionModal.answers.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Item Responses</span>
                {selectedSubmissionModal.answers.map((ans, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                    <span className="font-medium text-slate-800">{ans.questionText}</span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200">{ans.answerLabel}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedSubmissionModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Assessment Modal */}
      {isCreateAssessmentOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-5 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#5e2be2] flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Create New Assessment</h3>
                  <p className="text-xs text-slate-500 font-medium">Build a custom rating scale or assessment protocol</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateAssessmentOpen(false);
                  setNewQuestions(['']);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Assessment Title *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Generalized Anxiety Disorder Scale"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Acronym *</label>
                  <input
                    type="text"
                    required
                    value={newAcronym}
                    onChange={(e) => setNewAcronym(e.target.value)}
                    placeholder="e.g. GAD-7"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2]"
                  >
                    <option value="Anxiety">Anxiety</option>
                    <option value="Depression">Depression</option>
                    <option value="Stress">Stress</option>
                    <option value="Well-Being">Well-Being</option>
                    <option value="PTSD & Trauma">PTSD & Trauma</option>
                    <option value="Sleep">Sleep</option>
                    <option value="General Mental Health">General Mental Health</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Target Condition</label>
                  <input
                    type="text"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder="e.g. Anxiety Severity"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Provide a brief summary and scoring criteria..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Est. Duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={newEstimatedMinutes}
                  onChange={(e) => setNewEstimatedMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2]"
                />
              </div>

              {/* Rating Scale Section */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700">Rating Scale</label>
                <select
                  value={optionScalePreset}
                  onChange={(e) => setOptionScalePreset(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2]"
                >
                  <option value="0-3">0 – 3 Scale</option>
                  <option value="0-4">0 – 4 Scale</option>
                  <option value="yes-no">Yes / No</option>
                  <option value="custom">Custom</option>
                </select>

                {optionScalePreset === 'custom' && (
                  <div className="space-y-2 pt-1 pl-2 border-l-2 border-purple-300 bg-purple-50/40 p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#5e2be2]">Custom Option Labels</span>
                      <button
                        type="button"
                        onClick={addCustomOption}
                        className="text-[11px] text-[#5e2be2] font-extrabold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Option</span>
                      </button>
                    </div>
                    {customOptions.map((optVal, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400 w-8 text-right">Val {oIdx}:</span>
                        <input
                          type="text"
                          required
                          value={optVal}
                          onChange={(e) => updateCustomOption(oIdx, e.target.value)}
                          placeholder={`Option ${oIdx} label`}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#5e2be2]"
                        />
                        <button
                          type="button"
                          onClick={() => removeCustomOption(oIdx)}
                          disabled={customOptions.length <= 2}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded hover:bg-rose-50 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Questions Builder Section */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Assessment Question Items ({newQuestions.length})
                  </label>
                  <button
                    type="button"
                    onClick={addQuestionField}
                    className="text-xs text-[#5e2be2] hover:text-[#431bb5] font-extrabold flex items-center gap-1 cursor-pointer bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {newQuestions.map((qText, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-6 shrink-0 text-right">Q{idx + 1}.</span>
                      <input
                        type="text"
                        required
                        value={qText}
                        onChange={(e) => updateQuestionField(idx, e.target.value)}
                        placeholder="Enter question here..."
                        className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2]"
                      />
                      <button
                        type="button"
                        onClick={() => removeQuestionField(idx)}
                        disabled={newQuestions.length <= 1}
                        className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove question"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateAssessmentOpen(false);
                    setNewQuestions(['']);
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Create Assessment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
