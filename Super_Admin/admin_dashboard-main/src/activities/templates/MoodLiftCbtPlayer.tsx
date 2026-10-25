import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Lock,
  Clock,
  Scale,
  Sparkles,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  VolumeX,
  TrendingDown,
  Info,
  Check,
  Flame,
  HelpCircle,
  Lightbulb,
  Heart,
  Gavel,
  MessageSquareHeart,
  Eye,
  Sliders,
  Smile,
  Frown,
  Meh
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';
import { audioEngine } from '../utils/therapeuticAudioEngine';

export const MoodLiftCbtPlayer: React.FC<BaseActivityComponentProps> = ({
  activityId = 'ACT-10',
  activityName,
  onComplete
}) => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, [activityId]);

  if (activityId === 'ACT-10') {
    return <CbtBupaThoughtRecordPlayer activityName={activityName} onComplete={onComplete} />;
  } else {
    return <HolographicWorryVault activityName={activityName} onComplete={onComplete} />;
  }
};

/* ─────────────────────────────────────────────────────────────
   ACT-10: CBT THOUGHT RECORD & TRIAL (BUPA HEALTH 6-STEP METHOD)
   Reference: Bupa Health - "CBT techniques to challenge unhelpful thoughts"
   
   Step 1: Identify the Situation & Emotion (1–10 Scale)
   Step 2: Name the Negative Thought & Belief Rating
   Step 3: Challenge the Thought & Identify Thinking Trap
   Step 4: Evidence Against & "The Friend Question"
   Step 5: Find a Balanced Thought (Realistic Perspective)
   Step 6: Check How You Feel (Re-rate Emotion Intensity 1–10)
   ───────────────────────────────────────────────────────────── */
function CbtBupaThoughtRecordPlayer({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [thoughtData, setThoughtData] = useState({
    situation: '',
    emotion: 'Anxious',
    initialEmotionIntensity: 8, // 1 - 10
    automaticThought: '',
    initialBelief: 85, // 10% - 100%
    distortion: 'Catastrophizing',
    evidenceFor: '',
    evidenceAgainst: '',
    friendAdvice: '',
    balancedReframe: '',
    finalEmotionIntensity: 2, // 1 - 10
    finalBelief: 20 // 0% - 100%
  });
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [showFriendPrompt, setShowFriendPrompt] = useState<boolean>(false);
  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;

  const emotionsList = [
    { name: 'Anxious', icon: '😰', label: 'Anxious' },
    { name: 'Overwhelmed', icon: '🤯', label: 'Overwhelmed' },
    { name: 'Down / Sad', icon: '😔', label: 'Down / Sad' },
    { name: 'Frustrated', icon: '😤', label: 'Frustrated' },
    { name: 'Self-Conscious', icon: '😳', label: 'Self-Conscious' },
    { name: 'Stressed', icon: '😣', label: 'Stressed' }
  ];

  const quickSituationPrompts = [
    "Work presentation / high-stakes deadline",
    "A friend or colleague hasn't replied",
    "Made a mistake on an important task",
    "Speaking up in a group or meeting"
  ];

  const quickThoughtPrompts = [
    "If I make a mistake, everyone will lose respect.",
    "I'm overwhelmed and I won't be able to handle this.",
    "Everyone is silently judging my performance.",
    "Something terrible is bound to go wrong."
  ];

  const distortions = [
    {
      id: 'Catastrophizing',
      name: 'Catastrophizing',
      desc: 'Assuming the absolute worst will happen.',
      icon: '⚡'
    },
    {
      id: 'All-or-Nothing',
      name: 'All-or-Nothing',
      desc: 'Seeing only perfection or total failure.',
      icon: '🎯'
    },
    {
      id: 'Mind Reading',
      name: 'Mind Reading',
      desc: 'Assuming others are judging you negatively.',
      icon: '👥'
    },
    {
      id: 'Emotional Reasoning',
      name: 'Emotional Reasoning',
      desc: 'Treating anxious feelings as proven facts.',
      icon: '🧠'
    },
    {
      id: 'Overgeneralization',
      name: 'Overgeneralization',
      desc: 'Believing one setback ruins everything.',
      icon: '📉'
    },
    {
      id: 'Should Statements',
      name: 'Should Statements',
      desc: 'Demanding rigid, impossible standards.',
      icon: '⚖️'
    }
  ];

  const quickCounterEvidenceSuggestions = [
    "Feelings are not verified facts.",
    "I have handled similar challenges successfully before.",
    "One setback does not erase my abilities or worth.",
    "People are generally supportive and busy with themselves."
  ];

  const quickFriendAdviceOptions: Record<string, string[]> = {
    'Catastrophizing': [
      "Take a deep breath. Even if challenges arise, you have the skills to handle them step by step.",
      "The worst-case scenario almost never happens. You are much stronger than this fear."
    ],
    'All-or-Nothing': [
      "You don't need to be flawless to be capable. Progress is what truly matters.",
      "A mistake is just learning feedback, not proof of failure."
    ],
    'Mind Reading': [
      "You can't read minds. People are far more forgiving and focused on themselves.",
      "Focus on verified facts, not imaginary judgments."
    ],
    'Emotional Reasoning': [
      "Just because you feel anxious doesn't mean danger is real. You are safe.",
      "Give yourself grace. Discomfort is temporary and you are safe."
    ],
    'Overgeneralization': [
      "This is just one single moment, not your entire life. You will bounce back.",
      "Past successes prove you can overcome this bump in the road."
    ],
    'Should Statements': [
      "Treat yourself with the same kindness you give to others. Drop harsh rules.",
      "You are doing your best right now, and that is more than enough."
    ]
  };

  const quickReframeSuggestions: Record<string, string[]> = {
    'Catastrophizing': [
      "Even if challenges arise, I have the tools to handle them step by step.",
      "The worst-case is very unlikely. The realistic outcome is completely manageable."
    ],
    'All-or-Nothing': [
      "Partial progress is still genuine success. I embrace learning over perfection.",
      "I choose self-compassion. Doing my best is always enough."
    ],
    'Mind Reading': [
      "I cannot read minds. I choose to focus on verified facts, not assumed judgments.",
      "People are generally supportive and focused on their own responsibilities."
    ],
    'Emotional Reasoning': [
      "Feeling anxious does not make something true. Feelings are transient, facts are solid.",
      "I can feel discomfort while remaining calm, safe, and capable."
    ],
    'Overgeneralization': [
      "One isolated setback does not define my abilities or my future.",
      "This is a specific event, not a permanent pattern."
    ],
    'Should Statements': [
      "I replace rigid 'shoulds' with flexible goals and self-acceptance.",
      "I treat myself with patience, understanding, and realistic expectations."
    ]
  };

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    voiceEnabledRef.current = next;
    audioEngine.setVoiceEnabled(next);
    if (!next) {
      audioEngine.stopSpeaking();
    }
  };

  const handleSelectDistortion = (dName: string) => {
    audioEngine.playSfx('tactile_tap');
    setThoughtData((prev) => ({ ...prev, distortion: dName }));
  };

  const handleStepAdvance = (nextStep: 1 | 2 | 3 | 4 | 5 | 6) => {
    audioEngine.playSfx('tactile_tap');
    setStep(nextStep);
    if (voiceEnabledRef.current) {
      if (nextStep === 1) {
        audioEngine.speak('Step 1: Identify the situation that upset you, and rate the intensity of your emotion.');
      } else if (nextStep === 2) {
        audioEngine.speak('Step 2: Name the automatic negative thought and how strongly you believe it.');
      } else if (nextStep === 3) {
        audioEngine.speak('Step 3: Put the thought on trial. Identify the thinking trap and any factual evidence.');
      } else if (nextStep === 4) {
        audioEngine.speak('Step 4: Look for evidence against the thought, and ask what you would tell a friend.');
      } else if (nextStep === 5) {
        audioEngine.speak('Step 5: Formulate an alternative, more balanced way of seeing things.');
      } else if (nextStep === 6) {
        audioEngine.speak('Step 6: Check back in with your feelings and re-rate your emotional intensity.');
      }
    }
  };

  const handleFinish = () => {
    let reframeText = thoughtData.balancedReframe.trim();
    if (!reframeText) {
      const suggestions = quickReframeSuggestions[thoughtData.distortion] || quickReframeSuggestions['Catastrophizing'];
      reframeText = suggestions[0] || "I choose to view this situation with clarity and self-compassion.";
    }
    const finalData = { ...thoughtData, balancedReframe: reframeText };
    setThoughtData(finalData);
    audioEngine.playSfx('celebration_chords');
    if (voiceEnabledRef.current) {
      audioEngine.speak('Verdict reached: Thought neutralized. Your balanced perspective is locked in.');
    }
    setIsCompleted(true);
    if (onComplete) onComplete(finalData);
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    audioEngine.stopSpeaking();
    setStep(1);
    setThoughtData({
      situation: '',
      emotion: 'Anxious',
      initialEmotionIntensity: 8,
      automaticThought: '',
      initialBelief: 85,
      distortion: 'Catastrophizing',
      evidenceFor: '',
      evidenceAgainst: '',
      friendAdvice: '',
      balancedReframe: '',
      finalEmotionIntensity: 2,
      finalBelief: 20
    });
    setIsCompleted(false);
  };

  const forLength = thoughtData.evidenceFor.trim().length;
  const againstLength = thoughtData.evidenceAgainst.trim().length + (thoughtData.friendAdvice.trim().length ? 25 : 0);
  const totalEvidence = forLength + againstLength;
  const againstRatio = totalEvidence > 0 ? Math.round((againstLength / totalEvidence) * 100) : 60;
  const emotionRelief = Math.max(0, thoughtData.initialEmotionIntensity - thoughtData.finalEmotionIntensity);
  const reliefPercent = Math.round((emotionRelief / thoughtData.initialEmotionIntensity) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ─────────────────────────────────────────────────────────────
          1. CLEAN, VIEWPORT-FITTED 6-STEP CBT THOUGHT RECORD CARD
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-lg shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 relative overflow-hidden p-4 sm:p-5 select-none">
        {/* Soft Ambient Glows */}
        <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-[#5e2be2]/5 dark:bg-[#5e2be2]/10 blur-3xl pointer-events-none" />

        {/* Top Controls Bar */}
        <div className="relative z-10 flex items-center justify-end mb-2.5">
          <button
            onClick={handleToggleVoice}
            className="px-3 py-1 rounded-full text-[11px] font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Toggle Voice Guidance"
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#5e2be2]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span>{voiceEnabled ? 'Voice On' : 'Muted'}</span>
          </button>
        </div>

        {!isCompleted ? (
          <div className="space-y-4 relative z-10">

            {/* ─────────────────────────────────────────────────────────────
                STEP 1: IDENTIFY SITUATION & EMOTION (00:43 in video)
               ───────────────────────────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-3.5 animate-fade-in max-w-2xl mx-auto">
                <div className="text-center space-y-1">
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 inline-block shadow-xs">
                    Step 1 of 6
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                    <Info className="w-4 h-4 text-[#5e2be2]" />
                    What situation triggered this feeling?
                  </h3>
                </div>

                {/* Situation Input & Presets */}
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="e.g. Preparing for a presentation, receiving critical feedback, an unanswered text..."
                    value={thoughtData.situation}
                    onChange={(e) => setThoughtData({ ...thoughtData, situation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#5e2be2] font-medium shadow-xs"
                  />

                  {/* 1-Click Situation Presets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {quickSituationPrompts.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          audioEngine.playSfx('tactile_tap');
                          setThoughtData({ ...thoughtData, situation: p });
                        }}
                        className="text-[11px] px-2.5 py-1.5 bg-white hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-[#5e2be2] dark:hover:text-purple-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-purple-300 transition-all text-left font-medium cursor-pointer shadow-xs truncate block w-full"
                      >
                        📌 {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Emotion Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    What emotion are you feeling?
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {emotionsList.map((emo) => {
                      const isSel = thoughtData.emotion === emo.name;
                      return (
                        <button
                          key={emo.name}
                          type="button"
                          onClick={() => {
                            audioEngine.playSfx('tactile_tap');
                            setThoughtData({ ...thoughtData, emotion: emo.name });
                          }}
                          className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-xs ${
                            isSel
                              ? 'bg-purple-50 dark:bg-purple-950/70 border-[#5e2be2] ring-1 ring-[#5e2be2] text-[#5e2be2] dark:text-purple-300 font-black'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <span className="text-base">{emo.icon}</span>
                          <span className="text-[10.5px] truncate w-full">{emo.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Emotion Intensity Slider (1 to 10 scale from video) */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-[#5e2be2]" /> Emotion Intensity (1 to 10 scale):
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-black">
                      {thoughtData.initialEmotionIntensity} / 10 ({thoughtData.initialEmotionIntensity >= 8 ? 'Very Intense' : thoughtData.initialEmotionIntensity >= 5 ? 'Moderate' : 'Mild'})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={thoughtData.initialEmotionIntensity}
                    onChange={(e) => setThoughtData({ ...thoughtData, initialEmotionIntensity: Number(e.target.value) })}
                    className="w-full accent-[#5e2be2] cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                  <div className="flex justify-between text-[9.5px] font-bold text-slate-400">
                    <span>1 (Mild Discomfort)</span>
                    <span>5 (Moderate)</span>
                    <span>10 (Overwhelming)</span>
                  </div>
                </div>

                {/* Step Action */}
                <div className="flex justify-end pt-1">
                  <button
                    disabled={!thoughtData.situation.trim()}
                    onClick={() => handleStepAdvance(2)}
                    className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-md shadow-purple-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <span>Next: Name Negative Thought</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 2: NAME THE NEGATIVE THOUGHT (00:58 in video)
               ───────────────────────────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-3.5 animate-fade-in max-w-2xl mx-auto">
                <div className="text-center space-y-1">
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 inline-block shadow-xs">
                    Step 2 of 6
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    What automatic thought went through your mind?
                  </h3>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Type the exact automatic negative sentence you told yourself..."
                    value={thoughtData.automaticThought}
                    onChange={(e) => setThoughtData({ ...thoughtData, automaticThought: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#5e2be2] focus:bg-white dark:focus:bg-slate-900 font-medium leading-relaxed transition-all shadow-xs"
                  />

                  {/* 1-Click Example Thoughts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {quickThoughtPrompts.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          audioEngine.playSfx('tactile_tap');
                          setThoughtData({ ...thoughtData, automaticThought: p });
                        }}
                        className="text-[11px] px-2.5 py-1.5 bg-white hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/50 text-slate-700 dark:text-slate-300 hover:text-[#5e2be2] dark:hover:text-purple-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-purple-300 transition-all text-left font-medium cursor-pointer shadow-xs truncate block w-full"
                      >
                        "{p}"
                      </button>
                    ))}
                  </div>
                </div>

                {/* Belief Conviction Slider */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      How strongly do you believe this thought right now?
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-black">
                      {thoughtData.initialBelief}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={thoughtData.initialBelief}
                    onChange={(e) => setThoughtData({ ...thoughtData, initialBelief: Number(e.target.value) })}
                    className="w-full accent-[#5e2be2] cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                  <div className="flex justify-between text-[9.5px] font-bold text-slate-400">
                    <span>10% (Slight Doubt)</span>
                    <span>50% (Moderate)</span>
                    <span>100% (Absolute Fact)</span>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    disabled={!thoughtData.automaticThought.trim()}
                    onClick={() => handleStepAdvance(3)}
                    className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-md shadow-purple-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <span>Next: Challenge Thought</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 3: CHALLENGE THE THOUGHT & TRAPS (01:18 in video)
               ───────────────────────────────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-3.5 animate-fade-in max-w-2xl mx-auto">
                <div className="text-center space-y-1">
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 inline-block shadow-xs">
                    Step 3 of 6
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                    <Gavel className="w-4 h-4 text-[#5e2be2]" />
                    Put it on trial — Identify the thinking trap
                  </h3>
                </div>

                {/* 6 Distortion Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {distortions.map((d) => {
                    const isSelected = thoughtData.distortion === d.name;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSelectDistortion(d.name)}
                        className={`p-2.5 px-3 rounded-xl border text-left transition-all cursor-pointer relative shadow-xs ${
                          isSelected
                            ? 'bg-purple-50/90 dark:bg-purple-950/70 border-[#5e2be2] dark:border-purple-500 ring-2 ring-[#5e2be2]/30'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-purple-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-black text-xs ${isSelected ? 'text-[#5e2be2] dark:text-purple-300' : 'text-slate-900 dark:text-white'}`}>
                            {d.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#5e2be2] dark:text-purple-300 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                          {d.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Facts Supporting (Evidence For) */}
                <div className="p-3 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-1.5 shadow-xs">
                  <label className="text-[11px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Is there any factual evidence supporting this thought?
                  </label>
                  <textarea
                    rows={2}
                    placeholder="What makes this worry feel convincing? (Remember: feelings are not facts)..."
                    value={thoughtData.evidenceFor}
                    onChange={(e) => setThoughtData({ ...thoughtData, evidenceFor: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium leading-relaxed transition-all shadow-xs"
                  />
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepAdvance(4)}
                    className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-md shadow-purple-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <span>Next: Evidence Against</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 4: EVIDENCE AGAINST & THE FRIEND QUESTION (01:42 in video)
               ───────────────────────────────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-3 animate-fade-in max-w-2xl mx-auto">
                <div className="text-center space-y-1">
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 inline-block shadow-xs">
                    Step 4 of 6
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Look for evidence against the thought
                  </h3>
                </div>

                {/* Dynamic Evidence Scale / Balance Meter */}
                <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-xs">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Supporting Facts
                  </span>

                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                    <div
                      className="bg-amber-400 transition-all duration-300"
                      style={{ width: `${100 - againstRatio}%` }}
                    />
                    <div
                      className="bg-emerald-500 transition-all duration-300"
                      style={{ width: `${againstRatio}%` }}
                    />
                  </div>

                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                    <Scale className="w-3 h-3" /> Counter-Evidence ({againstRatio}%)
                  </span>
                </div>

                {/* Counter-Evidence Textarea */}
                <div className="p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-1.5 shadow-xs">
                  <label className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    What facts prove this thought is not 100% true?
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Think of times things went well, your past successes, or objective reasons this worry is an exaggeration..."
                    value={thoughtData.evidenceAgainst}
                    onChange={(e) => setThoughtData({ ...thoughtData, evidenceAgainst: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium leading-relaxed transition-all shadow-xs"
                  />

                  {/* 1-Click Counter-Evidence Chips */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {quickCounterEvidenceSuggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          audioEngine.playSfx('tactile_tap');
                          const updated = thoughtData.evidenceAgainst
                            ? `${thoughtData.evidenceAgainst}\n• ${sug}`
                            : `• ${sug}`;
                          setThoughtData({ ...thoughtData, evidenceAgainst: updated });
                        }}
                        className="text-[10px] px-2 py-0.5 bg-white hover:bg-emerald-100 dark:bg-slate-900 text-emerald-800 dark:text-emerald-200 rounded-md border border-emerald-200 dark:border-emerald-800 font-medium cursor-pointer shadow-xs"
                      >
                        + "{sug}"
                      </button>
                    ))}
                  </div>
                </div>

                {/* The Bupa Hallmark: "The Friend Question" */}
                <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#5e2be2] dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquareHeart className="w-3.5 h-3.5 text-[#5e2be2]" />
                      The Friend Question: What would you tell a friend?
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFriendPrompt(!showFriendPrompt)}
                      className="text-[10.5px] font-bold text-[#5e2be2] dark:text-purple-300 hover:underline cursor-pointer"
                    >
                      {showFriendPrompt ? 'Hide' : 'Suggestions'}
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="If someone you cared about was in this situation, what would you say to them?..."
                    value={thoughtData.friendAdvice}
                    onChange={(e) => setThoughtData({ ...thoughtData, friendAdvice: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#5e2be2] font-medium shadow-xs"
                  />

                  {/* 1-Click Friend Advice Options */}
                  {(showFriendPrompt || !thoughtData.friendAdvice) && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {(quickFriendAdviceOptions[thoughtData.distortion] || quickFriendAdviceOptions['Catastrophizing']).map((adv) => (
                        <button
                          key={adv}
                          type="button"
                          onClick={() => {
                            audioEngine.playSfx('tactile_tap');
                            setThoughtData({ ...thoughtData, friendAdvice: adv });
                          }}
                          className="text-[10px] px-2 py-1 bg-white hover:bg-purple-100 dark:bg-slate-900 text-purple-900 dark:text-purple-200 rounded-md border border-purple-200 dark:border-purple-800 font-medium cursor-pointer shadow-xs truncate max-w-full text-left"
                        >
                          💬 "{adv}"
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepAdvance(5)}
                    className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <span>Next: Balanced Thought</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 5: FIND A BALANCED THOUGHT (01:59 in video)
               ───────────────────────────────────────────────────────────── */}
            {step === 5 && (
              <div className="space-y-3.5 animate-fade-in max-w-2xl mx-auto">
                <div className="text-center space-y-1">
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 inline-block shadow-xs">
                    Step 5 of 6
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Find a balanced, realistic thought
                  </h3>
                </div>

                {/* Strikethrough Original Thought */}
                <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-0.5 shadow-xs">
                  <span className="text-[9.5px] font-black uppercase text-rose-700 dark:text-rose-400 block">
                    ❌ Old Distorted Thought ({thoughtData.distortion}):
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 line-through opacity-80 font-medium leading-snug">
                    "{thoughtData.automaticThought}"
                  </p>
                </div>

                {/* Balanced Thought Textarea */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-2 shadow-xs">
                  <label className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Balanced, Realistic Perspective:
                  </label>

                  <textarea
                    rows={2.5}
                    placeholder="Weigh the evidence and write an alternative, realistic way of seeing things..."
                    value={thoughtData.balancedReframe}
                    onChange={(e) => setThoughtData({ ...thoughtData, balancedReframe: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium leading-relaxed transition-all shadow-xs"
                  />

                  {/* 1-Click Grounded Options */}
                  <div className="space-y-1 pt-0.5">
                    <div className="flex flex-col gap-1">
                      {(quickReframeSuggestions[thoughtData.distortion] || quickReframeSuggestions['Catastrophizing']).map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            audioEngine.playSfx('tactile_tap');
                            setThoughtData({ ...thoughtData, balancedReframe: sug });
                          }}
                          className="text-[11px] p-2 bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/50 text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 transition-all text-left font-medium cursor-pointer shadow-xs flex items-center justify-between gap-1.5"
                        >
                          <span className="truncate flex-1">"{sug}"</span>
                          <span className="shrink-0 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Use
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepAdvance(6)}
                    className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-md shadow-purple-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <span>Next: Check How You Feel</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 6: CHECK HOW YOU FEEL (02:19 in video)
               ───────────────────────────────────────────────────────────── */}
            {step === 6 && (
              <div className="space-y-3.5 animate-fade-in max-w-2xl mx-auto">
                <div className="text-center space-y-1">
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 inline-block shadow-xs">
                    Step 6 of 6
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                    <Heart className="w-4 h-4 text-purple-600" />
                    Check back in — How do you feel now?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Re-rate your <strong className="text-slate-800 dark:text-white">{thoughtData.emotion}</strong> intensity on the 1–10 scale.
                  </p>
                </div>

                {/* Re-Rating Emotion Intensity Slider (1 to 10 scale) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 dark:text-white">
                      Current {thoughtData.emotion} Intensity:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-black">
                        Now: {thoughtData.finalEmotionIntensity} / 10
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        (-{reliefPercent}% Relief)
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={thoughtData.finalEmotionIntensity}
                    onChange={(e) => setThoughtData({ ...thoughtData, finalEmotionIntensity: Number(e.target.value) })}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] font-bold text-slate-400">
                    <span>1 (Calm & Clear)</span>
                    <span>5 (Manageable)</span>
                    <span>10 (Overwhelming)</span>
                  </div>
                </div>

                {/* Post-Trial Belief Slider */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      Belief in old negative thought now:
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-[11px] font-black">
                      {thoughtData.finalBelief}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={thoughtData.finalBelief}
                    onChange={(e) => setThoughtData({ ...thoughtData, finalBelief: Number(e.target.value) })}
                    className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                </div>

                {/* Navigation & Finish */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <span>Complete Thought Record</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
              COMPLETION STATE: TRIAL SUMMARY & VERDICT (02:33 in video)
             ───────────────────────────────────────────────────────────── */
          <div className="py-3 text-center space-y-3 relative z-10 max-w-lg mx-auto animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 p-0.5 mx-auto flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-md shadow-emerald-500/10">
              <div className="w-full h-full rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-inner">
                <Gavel className="w-6 h-6" />
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Thought Trial Complete
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Distress dropped by <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{reliefPercent}%</strong> ({thoughtData.initialEmotionIntensity}/10 ➔ {thoughtData.finalEmotionIntensity}/10).
              </p>
            </div>

            {/* Before vs After Comparison Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {/* Old Thought */}
              <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 space-y-1 shadow-xs">
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                  ❌ Distorted Premise:
                </span>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 line-through opacity-80 leading-snug font-medium line-clamp-3">
                  "{thoughtData.automaticThought}"
                </p>
              </div>

              {/* Grounded Balanced Perspective */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-1 shadow-xs">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                  ✨ Balanced Reality:
                </span>
                <p className="text-[11px] text-slate-900 dark:text-slate-100 font-bold leading-snug line-clamp-3">
                  "{thoughtData.balancedReframe}"
                </p>
              </div>
            </div>

            {/* Friend Advice Highlight */}
            {thoughtData.friendAdvice.trim() && (
              <div className="p-2.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800 text-left space-y-0.5 shadow-xs">
                <span className="text-[9px] font-black uppercase text-[#5e2be2] dark:text-purple-300 block flex items-center gap-1">
                  <Heart className="w-3 h-3 text-[#5e2be2]" /> Compassionate Friend Insight:
                </span>
                <p className="text-[11px] text-slate-800 dark:text-slate-200 italic font-medium">
                  "{thoughtData.friendAdvice}"
                </p>
              </div>
            )}

            {/* Compact Metric Bar */}
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-center">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Before Trial</span>
                <span className="text-xs font-black text-rose-600">{thoughtData.initialEmotionIntensity}/10</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">After Trial</span>
                <span className="text-xs font-black text-emerald-600">{thoughtData.finalEmotionIntensity}/10</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Relief</span>
                <span className="text-xs font-black text-[#5e2be2]">+{reliefPercent}%</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleReset}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
              >
                <RotateCcw className="w-3 h-3" /> Challenge Another Thought
              </button>
              <button
                onClick={() => {
                  if (onComplete) onComplete(thoughtData);
                }}
                className="flex-1 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/25 transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Return to Activities
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EDUCATIONAL & CLINICAL DEEP-DIVE SECTION (Below Activity)
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-lg shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-6">
        {/* Section 1: Clinical Overview */}
        <div className="space-y-2">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            The Thought Record: How CBT Challenges Unhelpful Thinking
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal text-justify">
            Cognitive Behavioural Therapy (CBT) shows that automatic negative thoughts often create an unhelpful cycle between what you think, how you feel, and how you act. By writing down difficult situations, putting the thoughts on trial against verifiable facts, and applying the "friend perspective", you develop a more balanced and realistic point of view.
          </p>
        </div>

        {/* Section 2: The 6-Step CBT Protocol */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <Gavel className="w-4 h-4 text-[#5e2be2]" />
              <span>The 6-Step Thought Record Protocol</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 text-justify">
              The systematic framework from Bupa Health to interrupt automatic negative thoughts:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-1.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[9px] font-bold">1</span>
                  Identify Situation & Emotion
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Pinpoint what triggered your distress and rate your feeling on a 1–10 intensity scale.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-1.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[9px] font-bold">2</span>
                  Name the Negative Thought
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Write down the exact unhelpful sentence running through your mind and rate your belief in it.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-1.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[9px] font-bold">3</span>
                  Challenge with Facts
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Identify the thinking trap (e.g. catastrophizing) and see if there is any factual basis.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-1.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[9px] font-bold">4</span>
                  Evidence Against & Friend View
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Recall past achievements and ask what compassionate advice you would offer to a dear friend.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-1.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[9px] font-bold">5</span>
                  Find a Balanced Thought
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Formulate an objective, grounded replacement belief that reflects reality rather than fear.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-1.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[9px] font-bold">6</span>
                  Check Back In
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Re-rate your emotion intensity to tangibly experience the neurological drop in distress.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: When to Practice */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#5e2be2]" />
              <span>When to Use this Technique</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 text-justify">
              Practice this exercise whenever you notice automatic negative thoughts affecting your mood or decision-making. Over time, this rewires the brain’s default stress pathways, strengthening emotional stability and long-term resilience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-12: HOLOGRAPHIC WORRY VAULT (Postponement & Externalization)
   ───────────────────────────────────────────────────────────── */
function HolographicWorryVault({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [worryText, setWorryText] = useState<string>('');
  const [worryTime, setWorryTime] = useState<string>('5:30 PM');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [vaultPulse, setVaultPulse] = useState<boolean>(false);

  const handleDeposit = () => {
    if (!worryText.trim()) return;
    setVaultPulse(true);
    audioEngine.playSfx('vault_lock');
    audioEngine.speak('Worry safely sealed in the vault. You are released to focus on the present.');

    setTimeout(() => {
      setIsLocked(true);
      setVaultPulse(false);
      if (onComplete) onComplete({ worryText, worryTime });
    }, 600);
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    setWorryText('');
    setIsLocked(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ─────────────────────────────────────────────────────────────
          1. INTERACTIVE WORRY VAULT CONTAINER
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-5 text-slate-800 dark:text-white shadow-lg shadow-amber-500/5 border border-amber-100/80 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-amber-100/50 dark:bg-amber-950/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-purple-100/40 dark:bg-purple-950/20 blur-3xl pointer-events-none" />


        {!isLocked ? (
          <div className="max-w-md mx-auto space-y-3 relative z-10">
            <div className="space-y-1">
              <label className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> What worry is consuming your cognitive bandwidth?
              </label>
              <textarea
                rows={3}
                placeholder="Deposit your raw thought or fear into the vault to mentally disengage..."
                value={worryText}
                onChange={(e) => setWorryText(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-amber-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Scheduled Review Time:
                </label>
                <input
                  type="text"
                  value={worryTime}
                  onChange={(e) => setWorryTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">Container Status:</label>
                <div className="px-2.5 py-1.5 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-lg text-xs text-[#5e2be2] dark:text-purple-300 font-black">
                  {vaultPulse ? 'ENCRYPTING...' : 'AWAITING LOCK'}
                </div>
              </div>
            </div>

            <button
              disabled={!worryText.trim()}
              onClick={handleDeposit}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-500/25 transition-all cursor-pointer mt-1"
            >
              <Lock className="w-4 h-4" /> Lock & Seal in Worry Vault
            </button>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4 max-w-md mx-auto animate-fade-in relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 p-1 mx-auto shadow-md shadow-amber-500/10 flex items-center justify-center">
              <div className="w-full h-full rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Lock className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">Worry Safely Quarantined</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                Your concern is secured. You have permission to live in the present until your scheduled worry window at <strong className="text-amber-700 dark:text-amber-400 font-bold">{worryTime}</strong>.
              </p>
            </div>

            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              Deposit Another Thought
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EDUCATIONAL DESCRIPTION CARD: What is the Worry Box?
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xl shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-8">
        {/* Section 1: Overview */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            What is the Worry Box?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal text-justify">
            The Worry Box (Cognitive Worry Vault) is an evidence-based cognitive behavioral therapy (CBT) technique grounded in <strong>stimulus control</strong> and <strong>worry postponement</strong>. When anxious thoughts loop repetitively in working memory, the brain misinterprets them as immediate crises requiring continuous vigilance. By externalizing the concern into a secure holding container and scheduling a deliberate review window, you signal to your amygdala that the worry has been acknowledged without allowing it to hijack your present focus.
          </p>
        </div>

        {/* Section 2: How It Works */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#5e2be2]" />
              <span>How It Works</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 text-justify">
              Follow this 3-step containment sequence to disengage from rumination and reclaim cognitive bandwidth:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  1
                </span>
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider">
                  Externalize the Worry
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Identify the intrusive thought consuming your energy. Writing it out shifts the worry from an infinite internal threat into finite, tangible language.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  2
                </span>
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider">
                  Set a Review Window
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Designate a contained 15-minute window later in the day. Postponement reassures your brain that you aren't ignoring the problem—just choosing when to address it.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  3
                </span>
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider">
                  Lock & Disengage
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Lock the worry in the vault and mentally return to the present. If the thought returns before review time, remind yourself: "It is secured in the vault."
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Benefits */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#5e2be2]" />
              <span>Clinical Benefits</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 text-justify">
              Clinically verified outcomes of worry containment and stimulus control:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Brain className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Reduces Mental Clutter & Fatigue</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Frees up precious prefrontal working memory by transferring cognitive burdens out of mental loops into an external depository.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Interrupts Rumination Cascades</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Weakens chronic overthinking pathways by creating a deliberate behavioral buffer between experiencing an anxious impulse and reacting to it.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Establishes Stimulus Control</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Restricts catastrophic rumination to an intentional 15-minute slot, preventing background anxiety from contaminating your entire workday or evening.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enhances Emotional Distance</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Over 80% of worries postponed lose their perceived urgency with time, allowing rational problem-solving to replace panic.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Closing Takeaway */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-purple-500/10 border border-purple-200/80 dark:border-purple-800/60 flex items-start gap-3.5">
          <div className="w-7 h-7 rounded-full bg-[#5e2be2] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium text-justify">
            Containment is not denial—it is an intentional cognitive boundary. When review time arrives, open the vault to assess your worry with a calm, rested perspective.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MoodLiftCbtPlayer;
