import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Search,
  Clock,
  AlertTriangle,
  Send,
  Eye,
  Play,
  Sparkles,
  X,
  ChevronRight,
  Filter,
  ShieldAlert,
  Edit3,
  Download,
  Check,
  BookOpen,
  Layers,
  HelpCircle
} from 'lucide-react';
import {
  mockAssessments,
  mockAssessmentAssignments,
  mockClients
} from '../data/mockData';
import { useAppContext } from '../context/AppContext';
import type {
  ClinicalAssessment,
  AssessmentQuestion,
  AssessmentSeverityRange,
  AssessmentSubmission,
  AssessmentAssignment
} from '../types';

export const AssessmentsView: React.FC = () => {
  const { clients } = useAppContext();
  // Main State
  const [assessments, setAssessments] = useState<ClinicalAssessment[]>(mockAssessments);
  const [assignments, setAssignments] = useState<AssessmentAssignment[]>(mockAssessmentAssignments);

  // Fetch live assignments and submissions from MongoDB Atlas
  React.useEffect(() => {
    const fetchAssessmentsData = async () => {
      try {
        let res = await fetch('/api/admin/assessments').catch(() => null);
        if (!res || !res.ok) {
          res = await fetch('http://localhost:5000/api/admin/assessments').catch(() => null);
        }
        if (res && res.ok) {
          const data = await res.json();
          if (data?.assignments && Array.isArray(data.assignments) && data.assignments.length > 0) {
            setAssignments(data.assignments);
          }
        }
      } catch (e) {
        console.error('Error loading assessments data:', e);
      }
    };
    fetchAssessmentsData();
  }, []);

  // Active Navigation Tab: 'library' | 'builder' | 'assignments'
  const [activeTab, setActiveTab] = useState<'library' | 'builder' | 'assignments'>('library');

  // Filter and View States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [activeProtocolModal, setActiveProtocolModal] = useState<ClinicalAssessment | null>(null);
  const [activeRunnerModal, setActiveRunnerModal] = useState<ClinicalAssessment | null>(null);
  const [assignModalAssessment, setAssignModalAssessment] = useState<ClinicalAssessment | null>(null);
  const [selectedSubmissionModal, setSelectedSubmissionModal] = useState<AssessmentSubmission | null>(null);

  // Runner Simulator Internal State
  const [runnerCurrentStep, setRunnerCurrentStep] = useState(0);
  const [runnerAnswers, setRunnerAnswers] = useState<Record<string, number>>({});
  const [runnerCompletedReport, setRunnerCompletedReport] = useState<{
    score: number;
    maxScore: number;
    severity: AssessmentSeverityRange | null;
    flagged: boolean;
  } | null>(null);

  // Assignment Modal Internal State
  const [assignClientId, setAssignClientId] = useState('');
  const [assignFrequency, setAssignFrequency] = useState<'One-time' | 'Weekly' | 'Bi-weekly' | 'Monthly'>('Weekly');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom Builder Form State
  const [builderData, setBuilderData] = useState<Partial<ClinicalAssessment>>({
    title: '',
    acronym: '',
    targetCondition: '',
    category: 'Symptom Screener',
    type: 'Custom',
    description: '',
    estimatedMinutes: 5,
    validityScore: 'Validated Standard',
    targetPopulation: 'Adults (18+)',
    questions: [
      {
        id: 'q1',
        text: 'How often have you felt overwhelmed by daily responsibilities?',
        subtext: 'Rate your frequency over the last 14 days.',
        options: [
          { label: 'Never (0)', value: 0 },
          { label: 'Sometimes (1)', value: 1 },
          { label: 'Frequently (2)', value: 2 },
          { label: 'Constantly (3)', value: 3 }
        ]
      },
      {
        id: 'q2',
        text: 'How often have you experienced physical symptoms of tension or fatigue?',
        subtext: 'e.g. headaches, muscle soreness, restlessness.',
        options: [
          { label: 'Never (0)', value: 0 },
          { label: 'Sometimes (1)', value: 1 },
          { label: 'Frequently (2)', value: 2 },
          { label: 'Constantly (3)', value: 3 }
        ]
      }
    ],
    severityRanges: [
      { minScore: 0, maxScore: 2, label: 'Minimal Risk', color: 'bg-emerald-500', clinicalAction: 'No immediate action required.' },
      { minScore: 3, maxScore: 4, label: 'Moderate Risk', color: 'bg-amber-500', clinicalAction: 'Recommend wellness modules and stress reduction techniques.' },
      { minScore: 5, maxScore: 6, label: 'High Risk', color: 'bg-red-500', clinicalAction: 'Schedule clinical review session with assigned therapist.' }
    ]
  });

  // Trigger Toast Notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered Assessments Library
  const filteredAssessments = assessments.filter((ass) => {
    const matchesSearch =
      ass.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ass.acronym.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ass.targetCondition.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ass.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' ||
      ass.category === selectedCategory ||
      ass.targetCondition?.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  // Start Interactive Test Simulator
  const handleOpenRunner = (assessment: ClinicalAssessment) => {
    // If assessment doesn't have detailed questions yet, generate standard placeholder items for testing
    let questionsToUse = assessment.questions;
    if (!questionsToUse || questionsToUse.length === 0) {
      questionsToUse = Array.from({ length: assessment.questionCount || 5 }).map((_, idx) => ({
        id: `gen_${idx + 1}`,
        text: `Diagnostic Item #${idx + 1}: Rate symptom severity for ${assessment.targetCondition}`,
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

  // Select Option in Runner Simulator
  const handleRunnerSelectAnswer = (qId: string, val: number) => {
    setRunnerAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  // Calculate Runner Results Helper
  const calculateResultsWithAnswers = (answersMap: Record<string, number>) => {
    if (!activeRunnerModal || !activeRunnerModal.questions) return;
    let score = 0;
    let flagged = false;

    activeRunnerModal.questions.forEach((q) => {
      const selectedVal = answersMap[q.id] || 0;
      
      // PSS-10 Reverse Scoring Rule (Items q4, q5, q7, q8 reversed: 0=4, 1=3, 2=2, 3=1, 4=0)
      if (activeRunnerModal.acronym === 'PSS-10' && ['q4', 'q5', 'q7', 'q8'].includes(q.id)) {
        score += (4 - selectedVal);
      } else {
        score += selectedVal;
      }

      if (q.isRiskTrigger && selectedVal > 0) {
        flagged = true;
      }
    });

    const maxScore = activeRunnerModal.questions.reduce((acc, q) => {
      const maxOpt = Math.max(...q.options.map((o) => o.value));
      return acc + maxOpt;
    }, 0);

    // Find severity range match
    let matchedSeverity: AssessmentSeverityRange | null = null;
    if (activeRunnerModal.severityRanges && activeRunnerModal.severityRanges.length > 0) {
      matchedSeverity =
        activeRunnerModal.severityRanges.find((r) => score >= r.minScore && score <= r.maxScore) ||
        activeRunnerModal.severityRanges[activeRunnerModal.severityRanges.length - 1];
    } else {
      const ratio = score / (maxScore || 1);
      if (ratio < 0.25) matchedSeverity = { minScore: 0, maxScore: 5, label: 'Minimal / Low Risk', color: 'bg-emerald-500', clinicalAction: 'No immediate action required.' };
      else if (ratio < 0.5) matchedSeverity = { minScore: 6, maxScore: 10, label: 'Mild Symptom Elevation', color: 'bg-amber-500', clinicalAction: 'Monitor and review at next follow-up.' };
      else if (ratio < 0.75) matchedSeverity = { minScore: 11, maxScore: 15, label: 'Moderate Symptoms', color: 'bg-orange-500', clinicalAction: 'Consider targeted CBT or clinical intervention.' };
      else matchedSeverity = { minScore: 16, maxScore: 30, label: 'Severe Clinical Elevation', color: 'bg-red-500', clinicalAction: 'Immediate priority clinical assessment indicated.' };
    }

    setRunnerCompletedReport({
      score,
      maxScore,
      severity: matchedSeverity,
      flagged
    });
  };

  // Submit Runner Simulator Test
  const handleCalculateRunnerResults = () => {
    calculateResultsWithAnswers(runnerAnswers);
  };

  // Handle Assigning Assessment to Client
  const handleConfirmAssignment = async () => {
    if (!assignModalAssessment || !assignClientId) return;
    const clientList = clients && clients.length > 0 ? clients : mockClients;
    const clientObj = clientList.find((c) => c.id === assignClientId);
    const newAssignment: AssessmentAssignment = {
      id: `ASN-${Date.now().toString().slice(-4)}`,
      assessmentId: assignModalAssessment.id,
      assessmentAcronym: assignModalAssessment.acronym,
      assessmentTitle: assignModalAssessment.title,
      clientId: assignClientId,
      clientName: clientObj ? clientObj.name : 'Selected Client',
      clientAvatar: (clientObj as any)?.avatar || undefined,
      therapistName: clientObj ? clientObj.assignedTherapistName : 'Dr. Alex Harrison',
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: assignDueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      frequency: assignFrequency,
      status: 'Pending'
    };

    setAssignments([newAssignment, ...assignments]);
    setAssignModalAssessment(null);
    setAssignClientId('');
    showToast(`Successfully assigned ${assignModalAssessment.acronym} to ${newAssignment.clientName}!`);

    // Persist to MongoDB Atlas AssessmentAssignment collection
    try {
      let res = await fetch('/api/admin/assessments/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAssignment,
          clientEmail: clientObj?.email
        })
      }).catch(() => null);

      if (!res || !res.ok) {
        await fetch('http://localhost:5000/api/admin/assessments/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newAssignment,
            clientEmail: clientObj?.email
          })
        }).catch(() => null);
      }
    } catch (e) {
      console.error('Error persisting assignment to MongoDB:', e);
    }
  };

  // Handle Creating Custom Assessment from Builder
  const handleSaveCustomAssessment = () => {
    if (!builderData.title || !builderData.acronym) {
      showToast('Please specify an Assessment Title and Acronym.');
      return;
    }
    const newAss: ClinicalAssessment = {
      id: `ASS-${Date.now().toString().slice(-3)}`,
      title: builderData.title,
      acronym: builderData.acronym.toUpperCase(),
      questionCount: builderData.questions?.length || 5,
      targetCondition: builderData.targetCondition || 'General Wellness',
      category: builderData.category || 'Custom',
      timesCompleted: 0,
      type: 'Custom',
      description: builderData.description || 'Custom clinical questionnaire designed by platform administrator.',
      estimatedMinutes: builderData.estimatedMinutes || 5,
      validityScore: 'Custom Questionnaire',
      targetPopulation: builderData.targetPopulation || 'All Clients',
      authorOrSource: 'Hexpertify Admin',
      status: 'Active',
      assignedClientCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      questions: builderData.questions,
      severityRanges: builderData.severityRanges
    };

    setAssessments([newAss, ...assessments]);
    showToast(`Assessment "${newAss.title} (${newAss.acronym})" created successfully!`);
    setActiveTab('library');
  };

  // Add Question to Builder
  const handleAddQuestionToBuilder = () => {
    const questions = builderData.questions || [];
    const newQ: AssessmentQuestion = {
      id: `q_${questions.length + 1}`,
      text: `New Question Item #${questions.length + 1}`,
      subtext: 'Instructions or scale context for respondent',
      options: [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Several days (1)', value: 1 },
        { label: 'More than half the days (2)', value: 2 },
        { label: 'Nearly every day (3)', value: 3 }
      ]
    };
    setBuilderData({ ...builderData, questions: [...questions, newQ] });
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-in text-slate-800">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#4f28d9] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in border border-purple-300">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="font-bold text-xs tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-4 sm:p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1 sm:space-y-1.5">
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">Clinical Assessment Inventory</h1>
          <p className="text-purple-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Manage standardized diagnostic screeners (PSS-10, WHO-5, WSAS, PHQ-9, GAD-7, PCL-5, OCI-R, ASRS v1.1), build custom psychometric scales, monitor patient risk response alerts, and run interactive clinical test simulators.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap md:flex-col lg:flex-row items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('builder')}
            className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-white text-[#4f28d9] rounded-xl sm:rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-lg hover:bg-purple-50 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#4f28d9]" />
            Create Custom Assessment
          </button>
        </div>
      </div>

      {/* Integrated Search Toolbar & Navigation Tabs Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        {/* Top Section: Search Input & Category Filter */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Search input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by acronym, condition, title..."
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-[#5e2be2]"
            />
          </div>

          {/* Category Select Dropdown */}
          <div className="relative w-full sm:w-60">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-8 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-extrabold text-slate-800 outline-none focus:border-[#5e2be2] focus:bg-white appearance-none cursor-pointer transition-all"
            >
              <option value="All">All Categories</option>
              {['Stress', 'Depression', 'Anxiety', 'PTSD & Trauma', 'OCD', 'ADHD', 'Well-Being'].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-3 pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* Bottom Section: Replaces "Showing 8 of 8..." with the 3 navigation tabs */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'library'
                  ? 'bg-[#5e2be2] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              Screener Library ({assessments.length})
            </button>

            <button
              onClick={() => setActiveTab('builder')}
              className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'builder'
                  ? 'bg-[#5e2be2] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Assessment Builder
            </button>

            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'assignments'
                  ? 'bg-[#5e2be2] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Send className="w-4 h-4" />
              Client Assignment Hub ({assignments.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: SCREENER LIBRARY */}
      {activeTab === 'library' && (
        <div className="space-y-6">

          {/* Grid View */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssessments.map((ass) => (
                <div
                  key={ass.id}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 card-hover flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header Acronym & Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-3 py-1 bg-[#5e2be2]/10 text-[#5e2be2] font-extrabold font-mono text-xs rounded-xl border border-[#5e2be2]/20 flex-shrink-0">
                          {ass.acronym}
                        </span>
                        {ass.category && (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl truncate">
                            {ass.category}
                          </span>
                        )}
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200/60 flex-shrink-0">
                        {ass.type}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-snug">{ass.title}</h3>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{ass.description}</p>
                    </div>

                    {/* Target Condition Details */}
                    <div className="bg-slate-50 rounded-2xl p-3 text-[11px] space-y-1 text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Target Condition:</span>
                        <span className="font-bold text-slate-800">{ass.targetCondition}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-3 border-t border-slate-100">
                    {/* Meta stats */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        {ass.questionCount} Items
                      </span>
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        ~{ass.estimatedMinutes || 5} mins
                      </span>
                      <span className="font-bold text-slate-700">
                        {ass.timesCompleted.toLocaleString()} completed
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleOpenRunner(ass)}
                        className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition-all"
                        title="Run Interactive Test Simulator"
                      >
                        <Play className="w-3.5 h-3.5 fill-emerald-600" />
                        Test
                      </button>

                      <button
                        onClick={() => setActiveProtocolModal(ass)}
                        className="py-2.5 bg-purple-50 hover:bg-purple-100 text-[#5e2be2] font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition-all"
                        title="View Protocol Details & Cutoff Scale"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>

                      <button
                        onClick={() => setAssignModalAssessment(ass)}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition-all"
                        title="Assign Screener to Client"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Assign
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full min-w-[700px] whitespace-nowrap text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Acronym / Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Target Condition</th>
                    <th className="p-4">Items / Time</th>
                    <th className="p-4">Completions</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssessments.map((ass) => (
                    <tr key={ass.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-purple-100 text-[#5e2be2] font-extrabold font-mono text-xs rounded-lg">
                            {ass.acronym}
                          </span>
                          <div>
                            <span className="font-extrabold text-slate-900 block">{ass.title}</span>
                            <span className="text-[11px] text-slate-400">{ass.type} Assessment</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-md">
                          {ass.category || 'General'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{ass.targetCondition}</td>
                      <td className="p-4">
                        <span className="font-semibold">{ass.questionCount} Questions</span>
                        <span className="text-slate-400 block text-[11px]">~{ass.estimatedMinutes || 5} mins</span>
                      </td>
                      <td className="p-4 font-extrabold text-slate-900">
                        {ass.timesCompleted.toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenRunner(ass)}
                            className="p-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-all"
                            title="Test Simulator"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setActiveProtocolModal(ass)}
                            className="p-2 bg-purple-50 text-[#5e2be2] rounded-lg hover:bg-purple-100 transition-all"
                            title="Protocol Info"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setAssignModalAssessment(ass)}
                            className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all"
                            title="Assign to Client"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSESSMENT BUILDER */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Builder Form Controls */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Custom Screener Builder</h3>
                  <p className="text-xs text-slate-500">Configure questions, response choices, and severity cutoff ranges.</p>
                </div>
                <span className="px-3 py-1 bg-purple-100 text-[#5e2be2] font-bold text-xs rounded-full">
                  Draft Mode
                </span>
              </div>

              {/* General Metadata Inputs */}
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Assessment Title *</label>
                    <input
                      type="text"
                      value={builderData.title}
                      onChange={(e) => setBuilderData({ ...builderData, title: e.target.value })}
                      placeholder="e.g. Work Resilience & Stress Index"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#5e2be2] font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Acronym *</label>
                    <input
                      type="text"
                      value={builderData.acronym}
                      onChange={(e) => setBuilderData({ ...builderData, acronym: e.target.value })}
                      placeholder="e.g. WRSI-10"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#5e2be2] font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Target Condition</label>
                    <input
                      type="text"
                      value={builderData.targetCondition}
                      onChange={(e) => setBuilderData({ ...builderData, targetCondition: e.target.value })}
                      placeholder="e.g. Work Stress & Executive Fatigue"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Category</label>
                    <select
                      value={builderData.category}
                      onChange={(e) => setBuilderData({ ...builderData, category: e.target.value as any })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                    >
                      <option value="Stress">Stress</option>
                      <option value="Depression">Depression</option>
                      <option value="Anxiety">Anxiety</option>
                      <option value="PTSD & Trauma">PTSD & Trauma</option>
                      <option value="OCD">OCD</option>
                      <option value="ADHD">ADHD</option>
                      <option value="Well-Being">Well-Being</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={builderData.description}
                    onChange={(e) => setBuilderData({ ...builderData, description: e.target.value })}
                    placeholder="Provide detailed instructions and clinical scope of this screener..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Questions Section */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#5e2be2]" />
                    Question Items ({builderData.questions?.length || 0})
                  </h4>
                  <button
                    onClick={handleAddQuestionToBuilder}
                    className="px-3.5 py-1.5 bg-purple-50 text-[#5e2be2] font-extrabold text-xs rounded-xl hover:bg-purple-100 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Question
                  </button>
                </div>

                <div className="space-y-3">
                  {builderData.questions?.map((q, idx) => (
                    <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-[#5e2be2] font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) => {
                            const updated = [...(builderData.questions || [])];
                            updated[idx].text = e.target.value;
                            setBuilderData({ ...builderData, questions: updated });
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none"
                        />
                        <button
                          onClick={() => {
                            const updated = (builderData.questions || []).filter((_, i) => i !== idx);
                            setBuilderData({ ...builderData, questions: updated });
                          }}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pl-9">
                        <span className="text-slate-500">Choice Scale: Standard 4-point (0-3)</span>
                        <label className="flex items-center gap-1 text-slate-700 cursor-pointer justify-end">
                          <input
                            type="checkbox"
                            checked={!!q.isRiskTrigger}
                            onChange={(e) => {
                              const updated = [...(builderData.questions || [])];
                              updated[idx].isRiskTrigger = e.target.checked;
                              setBuilderData({ ...builderData, questions: updated });
                            }}
                          />
                          <span className="font-bold text-red-600">Mark Safety Trigger Item</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setActiveTab('library')}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomAssessment}
                  className="px-6 py-2.5 bg-[#5e2be2] text-white font-extrabold text-xs rounded-xl shadow-lg hover:bg-[#4f28d9] flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Publish Assessment Tool
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Mobile/Tablet Live Preview Side Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 text-white rounded-[32px] p-6 shadow-2xl space-y-5 border border-slate-800 sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-mono text-slate-400 ml-2">Live Respondent Simulator</span>
                </div>
                <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded-md uppercase">
                  Mobile Preview
                </span>
              </div>

              {/* Screener Preview Container */}
              <div className="bg-slate-800/80 rounded-2xl p-5 space-y-4 border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-purple-600 text-white font-mono font-bold text-xs rounded-lg">
                    {builderData.acronym || 'PREVIEW'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">~{builderData.estimatedMinutes || 5} min complete</span>
                </div>

                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {builderData.title || 'Untitled Assessment Tool'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {builderData.description || 'Preview instructions for respondent.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-700/50 space-y-3">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">
                    Sample Question #1:
                  </span>
                  <p className="text-xs font-semibold text-slate-100">
                    {builderData.questions?.[0]?.text || 'Sample Question text will appear here.'}
                  </p>

                  <div className="space-y-2 pt-1">
                    {[
                      'Not at all (0)',
                      'Several days (1)',
                      'More than half the days (2)',
                      'Nearly every day (3)'
                    ].map((opt, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-slate-700/50 rounded-xl text-xs text-slate-300 hover:bg-purple-600/30 hover:border-purple-400 border border-slate-600/40 flex items-center justify-between cursor-pointer transition-all"
                      >
                        <span>{opt}</span>
                        <div className="w-4 h-4 rounded-full border border-slate-500" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 rounded-2xl p-4 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Calculated Scoring Type:</span>
                  <span className="text-slate-200 font-bold">Summative Severity Scale</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CLIENT ASSIGNMENT HUB */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">Scheduled Screener Deliveries</h3>
              <p className="text-xs text-slate-500">Track active recurring assessments sent to patients.</p>
            </div>
            <button
              onClick={() => {
                if (assessments.length > 0) setAssignModalAssessment(assessments[0]);
              }}
              className="px-5 py-2.5 bg-[#5e2be2] text-white font-extrabold text-xs rounded-2xl flex items-center gap-2 shadow-md hover:bg-[#4f28d9]"
            >
              <Send className="w-4 h-4" />
              Assign New Assessment
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Client Patient</th>
                  <th className="p-4">Assigned Therapist</th>
                  <th className="p-4">Assigned Assessment</th>
                  <th className="p-4">Delivery Frequency</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((asn) => (
                  <tr key={asn.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-4">
                      <div>
                        <span className="font-extrabold text-slate-900 block">{asn.clientName}</span>
                        <span className="text-[11px] text-slate-400">ID: {asn.clientId}</span>
                      </div>
                    </td>
                    <td className="p-4 font-extrabold text-slate-800">
                      {asn.therapistName}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-purple-100 text-[#5e2be2] font-mono font-bold text-xs rounded-md mr-1.5">
                        {asn.assessmentAcronym}
                      </span>
                      <span className="font-bold text-slate-800">{asn.assessmentTitle}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-700 whitespace-nowrap">{asn.frequency}</td>
                    <td className="p-4 font-semibold text-slate-700 whitespace-nowrap">{asn.dueDate}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                          asn.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : asn.status === 'Overdue'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {asn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: INTERACTIVE TEST RUNNER SIMULATOR */}
      {activeRunnerModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] my-auto">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#4f28d9] to-[#5e2be2] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white font-mono font-extrabold text-xs rounded-lg border border-white/20">
                  {activeRunnerModal.acronym}
                </span>
                <div>
                  <h3 className="font-extrabold text-lg leading-tight">{activeRunnerModal.title}</h3>
                  <p className="text-xs text-purple-200 mt-0.5">Interactive Test Simulator & Real-time Scoring</p>
                </div>
              </div>
              <button
                onClick={() => setActiveRunnerModal(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
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
                        {Math.round(((runnerCurrentStep + 1) / (activeRunnerModal.questions?.length || 1)) * 100)}% Complete
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#5e2be2] transition-all duration-300"
                        style={{
                          width: `${((runnerCurrentStep + 1) / (activeRunnerModal.questions?.length || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Active Question Box */}
                  {activeRunnerModal.questions && activeRunnerModal.questions[runnerCurrentStep] && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                        {activeRunnerModal.questions[runnerCurrentStep].isRiskTrigger && (
                          <span className="px-2.5 py-0.5 bg-red-100 text-red-700 font-extrabold text-[10px] rounded-md flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" /> Safety Trigger Question
                          </span>
                        )}
                        <h4 className="font-extrabold text-slate-900 text-base">
                          {activeRunnerModal.questions[runnerCurrentStep].text}
                        </h4>
                        {activeRunnerModal.questions[runnerCurrentStep].subtext && (
                          <p className="text-xs text-slate-500">
                            {activeRunnerModal.questions[runnerCurrentStep].subtext}
                          </p>
                        )}
                      </div>

                      {/* Options Radio List */}
                      <div className="space-y-2.5">
                        {activeRunnerModal.questions[runnerCurrentStep].options.map((opt) => {
                          const isSelected =
                            runnerAnswers[activeRunnerModal.questions![runnerCurrentStep].id] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() =>
                                handleRunnerSelectAnswer(activeRunnerModal.questions![runnerCurrentStep].id, opt.value)
                              }
                              className={`w-full p-4 rounded-2xl border text-left font-bold text-xs flex items-center justify-between transition-all ${
                                isSelected
                                  ? 'bg-purple-50 border-[#5e2be2] text-[#5e2be2] shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{opt.label}</span>
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                  isSelected ? 'border-[#5e2be2] bg-[#5e2be2] text-white' : 'border-slate-300'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Completed Diagnostics Report */
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-4 text-center">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-purple-300">
                      Calculated Diagnostic Outcome
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
                        {runnerCompletedReport.severity?.label || 'Elevated Score'}
                      </span>
                    </div>

                    {runnerCompletedReport.flagged && (
                      <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-2xl text-red-200 text-xs font-bold flex items-center justify-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                        CRITICAL SAFETY FLAG DETECTED (Item #9 Response &gt; 0)
                      </div>
                    )}
                  </div>

                  {/* Clinical Recommendation */}
                  <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 space-y-2">
                    <h5 className="font-extrabold text-[#5e2be2] text-xs uppercase tracking-wider">
                      Recommended Clinical Protocol:
                    </h5>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {runnerCompletedReport.severity?.clinicalAction ||
                        'Conduct thorough clinical evaluation and review symptom progression at next consultation.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {!runnerCompletedReport ? (
                <>
                  <button
                    disabled={runnerCurrentStep === 0}
                    onClick={() => setRunnerCurrentStep((prev) => Math.max(0, prev - 1))}
                    className="px-4 py-2 bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Back
                  </button>

                  {runnerCurrentStep < (activeRunnerModal.questions?.length || 1) - 1 ? (
                    <button
                      disabled={
                        runnerAnswers[activeRunnerModal.questions?.[runnerCurrentStep]?.id || ''] === undefined
                      }
                      onClick={() => setRunnerCurrentStep((prev) => prev + 1)}
                      className="px-6 py-2 bg-[#5e2be2] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#5e2be2] text-white font-extrabold text-xs rounded-xl shadow-md hover:bg-[#4f28d9] flex items-center gap-1.5 transition-all"
                    >
                      Next Item <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      disabled={
                        runnerAnswers[activeRunnerModal.questions?.[runnerCurrentStep]?.id || ''] === undefined
                      }
                      onClick={handleCalculateRunnerResults}
                      className="px-6 py-2 bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md hover:bg-emerald-700 flex items-center gap-1.5 transition-all"
                    >
                      Calculate Final Score <Check className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full flex items-center justify-between">
                  <button
                    onClick={() => {
                      setRunnerCompletedReport(null);
                      setRunnerCurrentStep(0);
                      setRunnerAnswers({});
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Restart Simulator
                  </button>
                  <button
                    onClick={() => setActiveRunnerModal(null)}
                    className="px-6 py-2 bg-[#5e2be2] text-white font-extrabold text-xs rounded-xl"
                  >
                    Close Test Runner
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: CLINICAL PROTOCOL DETAILS MODAL */}
      {activeProtocolModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl bg-white rounded-2xl sm:rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] my-auto">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-purple-600 text-white font-mono font-extrabold text-xs rounded-lg">
                  {activeProtocolModal.acronym}
                </span>
                <div>
                  <h3 className="font-extrabold text-lg">{activeProtocolModal.title}</h3>
                  <p className="text-xs text-slate-400">Clinical Protocol & Scoring Rules</p>
                </div>
              </div>
              <button
                onClick={() => setActiveProtocolModal(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {/* Meta Box */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-semibold">Target Condition</span>
                  <span className="font-extrabold text-slate-900 text-sm">{activeProtocolModal.targetCondition}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Source / Author</span>
                  <span className="font-bold text-slate-800">{activeProtocolModal.authorOrSource || "Clinical Literature"}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 mb-1">Clinical Scope & Guidelines</h4>
                <p className="text-slate-600 leading-relaxed">{activeProtocolModal.description}</p>
              </div>

              {/* Official PDF Marking & Scoring System Breakdown */}
              <div className="p-4 bg-gradient-to-br from-purple-50 via-slate-50 to-indigo-50/50 rounded-2xl border border-purple-200/70 space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#5e2be2]" />
                  <h4 className="font-extrabold text-sm text-slate-900">Official PDF Marking & Scoring System</h4>
                </div>

                {activeProtocolModal.acronym === 'PSS-10' && (
                  <div className="space-y-1.5 text-slate-700">
                    <p className="font-bold text-[#5e2be2]">★ Reverse Scoring Formula:</p>
                    <p>Items 4, 5, 7, and 8 are reverse scored: <code className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-mono font-bold">0 → 4, 1 → 3, 2 → 2, 3 → 1, 4 → 0</code>.</p>
                    <p className="font-medium text-slate-600">Total Score Range: 0 to 40. Scores 27+ indicate high perceived stress level.</p>
                  </div>
                )}

                {activeProtocolModal.acronym === 'WHO-5' && (
                  <div className="space-y-1.5 text-slate-700">
                    <p className="font-bold text-[#5e2be2]">★ Percentage Score Formula:</p>
                    <p>Raw Score (0–25) = sum of 5 items (0 to 5 scale). <code className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-mono font-bold">Percentage Score = Raw Score × 4</code> (0% to 100%).</p>
                    <p className="font-medium text-slate-600">Percentage &lt; 50% (Raw &lt; 13) indicates poor mental well-being & depression screen indication.</p>
                  </div>
                )}

                {activeProtocolModal.acronym === 'WSAS' && (
                  <div className="space-y-1.5 text-slate-700">
                    <p className="font-bold text-[#5e2be2]">★ 9-Point Impairment Scale (0 to 8):</p>
                    <p>5 life domains (Work, Home, Social Leisure, Private Leisure, Relationships). Rated 0 (Not at all) to 8 (Very severely impaired).</p>
                    <p className="font-medium text-slate-600">Total Score Range: 0 to 40. Scores &gt; 20 suggest moderately severe or worse psychopathology.</p>
                  </div>
                )}

                {activeProtocolModal.acronym === 'PHQ-9' && (
                  <div className="space-y-1.5 text-slate-700">
                    <p className="font-bold text-[#5e2be2]">★ 4-Point Frequency Scale (0 to 3):</p>
                    <p>Rated 0 (Not at all) to 3 (Nearly every day). Item 9 is marked as a critical Safety Risk Trigger for suicidal ideation.</p>
                    <p className="font-medium text-slate-600">Total Score Range: 0 to 27 across 5 severity tiers (Minimal, Mild, Moderate, Moderately Severe, Severe).</p>
                  </div>
                )}

                {activeProtocolModal.acronym === 'GAD-7' && (
                  <div className="space-y-1.5 text-slate-700">
                    <p className="font-bold text-[#5e2be2]">★ 4-Point Frequency Scale (0 to 3):</p>
                    <p>7 items rated 0 (Not at all) to 3 (Nearly every day) evaluating core anxiety symptoms over past 14 days.</p>
                    <p className="font-medium text-slate-600">Total Score Range: 0 to 21. Cutoffs: 5 (Mild), 10 (Moderate), 15 (Severe Anxiety).</p>
                  </div>
                )}

                {activeProtocolModal.acronym === 'PCL-5' && (
                  <div className="space-y-1.5 text-slate-700">
                    <p className="font-bold text-[#5e2be2]">★ DSM-5 PTSD Diagnostic Endorsement Rule:</p>
                    <p>20 items rated 0–4. Requires endorsement (rated ≥ 2 'Moderately'): 1 Criterion B (Q1-5), 1 Criterion C (Q6-7), 2 Criterion D (Q8-14), 2 Criterion E (Q15-20).</p>
                    <p className="font-medium text-slate-600">Total Score Range: 0 to 80. Recommended cut-point score of 33 for provisional PTSD diagnosis.</p>
                  </div>
                )}

                {activeProtocolModal.acronym === 'OCI-R' && (
                  <div className="space-y-1.5 text-slate-700">
                    <p className="font-bold text-[#5e2be2]">★ 6 Clinical OCD Subscales:</p>
                    <p>18 items rated 0–4 (Washing, Obsessing, Hoarding, Ordering, Checking, Neutralizing subscales with 3 items each).</p>
                    <p className="font-medium text-slate-600">Total Score Range: 0 to 72. Recommended clinical cutoff score is 21 (scores ≥ 21 indicate likely OCD).</p>
                  </div>
                )}

                {activeProtocolModal.acronym === 'ASRS v1.1' && (
                  <div className="space-y-1.5 text-slate-700">
                    <p className="font-bold text-[#5e2be2]">★ Part A Screening Threshold Rule:</p>
                    <p>18 items rated 0 (Never) to 4 (Very Often). Part A consists of Q1–Q6.</p>
                    <p className="font-medium text-slate-600">Endorsing 4 or more shaded items in Part A indicates high likelihood of Adult ADHD requiring full evaluation.</p>
                  </div>
                )}
              </div>

              {/* Severity Cutoff Table */}
              {activeProtocolModal.severityRanges && activeProtocolModal.severityRanges.length > 0 && (
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-2">Diagnostic Score Thresholds & Cutoffs</h4>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <tr>
                          <th className="p-3">Score Range</th>
                          <th className="p-3">Severity Level</th>
                          <th className="p-3">Clinical Action Plan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeProtocolModal.severityRanges.map((range, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-bold text-slate-900">
                              {range.minScore} - {range.maxScore} pts
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-full text-white font-extrabold text-[10px] ${range.color}`}>
                                {range.label}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 font-medium">{range.clinicalAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const target = activeProtocolModal;
                  setActiveProtocolModal(null);
                  handleOpenRunner(target);
                }}
                className="px-5 py-2.5 bg-emerald-600 text-white font-extrabold text-xs rounded-xl flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                Launch Live Simulator
              </button>
              <button
                onClick={() => setActiveProtocolModal(null)}
                className="px-5 py-2.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close Protocol
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: ASSIGN ASSESSMENT TO CLIENT MODAL */}
      {assignModalAssessment && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-[32px] shadow-2xl border border-slate-100 p-4 sm:p-6 space-y-4 sm:space-y-5 my-auto max-h-[94vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#5e2be2]" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Assign {assignModalAssessment.acronym}
                </h3>
              </div>
              <button onClick={() => setAssignModalAssessment(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Patient Client *</label>
                <select
                  value={assignClientId}
                  onChange={(e) => setAssignClientId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800"
                >
                  <option value="">-- Choose Client --</option>
                  {(clients && clients.length > 0 ? clients : mockClients).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.service || 'Individual Therapy'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Recurrence Frequency</label>
                <select
                  value={assignFrequency}
                  onChange={(e) => setAssignFrequency(e.target.value as any)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="One-time">One-time Assessment</option>
                  <option value="Weekly">Weekly (Recommended for PHQ-9/GAD-7)</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Due Date</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                />
              </div>

              <div className="p-3 bg-purple-50 rounded-2xl text-[11px] text-purple-900 border border-purple-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5e2be2] shrink-0" />
                <span>The client will receive an automated in-app prompt & email link to complete this screener.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setAssignModalAssessment(null)}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssignment}
                className="px-6 py-2.5 bg-[#5e2be2] text-white font-extrabold text-xs rounded-xl shadow-md hover:bg-[#4f28d9]"
              >
                Send Assignment
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 4: SUBMISSION RESPONSES BREAKDOWN */}
      {selectedSubmissionModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-[32px] shadow-2xl border border-slate-100 p-4 sm:p-6 space-y-4 sm:space-y-5 my-auto max-h-[94vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {selectedSubmissionModal.clientName}'s Response Log
                </h3>
                <p className="text-xs text-slate-400">{selectedSubmissionModal.assessmentTitle}</p>
              </div>
              <button onClick={() => setSelectedSubmissionModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Score Evaluated</span>
                  <span className="text-2xl font-extrabold">
                    {selectedSubmissionModal.totalScore} / {selectedSubmissionModal.maxScore}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedSubmissionModal.severityColor}`}>
                  {selectedSubmissionModal.severityLabel}
                </span>
              </div>

              {selectedSubmissionModal.answers.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedSubmissionModal.answers.map((ans: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 block">{ans.questionText}</span>
                        <span className="text-purple-700 font-semibold">{ans.answerLabel}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 text-sm bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        +{ans.score}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic p-3 bg-slate-50 rounded-xl text-center">
                  Full item responses archived in client electronic health record.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => showToast('Exported clinical PDF report to Downloads!')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
              <button
                onClick={() => setSelectedSubmissionModal(null)}
                className="px-5 py-2 bg-[#5e2be2] text-white font-extrabold text-xs rounded-xl"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
