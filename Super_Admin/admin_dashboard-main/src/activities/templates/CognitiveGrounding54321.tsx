import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Eye,
  Hand,
  Volume2,
  VolumeX,
  Wind,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  Activity,
  Award,
  Play,
  Clock,
  ShieldCheck,
  Brain,
  Zap
} from 'lucide-react';
import { audioEngine } from '../utils/therapeuticAudioEngine';

/* ─────────────────────────────────────────────────────────────
   ACT-13: 5-4-3-2-1 SENSORY GROUNDING TECHNIQUE
   Inspired by: "The 5-4-3-2-1 Method: A Grounding Exercise to Manage Anxiety"
   (Evidence-Based Somatic Grounding & Amygdala Downregulation)
   ───────────────────────────────────────────────────────────── */

interface StepDef {
  number: number;
  sense: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeBg: string;
  prompt: string;
  suggestions: string[];
}

const STEPS: StepDef[] = [
  {
    number: 5,
    sense: 'SEE',
    label: '5 Things You Can See',
    icon: Eye,
    color: 'text-sky-500',
    badgeBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-300/60 dark:border-sky-800/60',
    prompt: 'Look around your room or space. Notice 5 distinct things you can see (colors, shapes, patterns, or shadows).',
    suggestions: [
      'A shadow on the wall or floor',
      'The texture of my desk',
      'The color of my clothes',
      'Light reflecting off a window',
      'A plant, leaf, or wood grain',
      'A pen or water bottle',
      'The outline of a doorway or screen'
    ]
  },
  {
    number: 4,
    sense: 'TOUCH',
    label: '4 Things You Can Feel',
    icon: Hand,
    color: 'text-indigo-500',
    badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-300/60 dark:border-indigo-800/60',
    prompt: 'Pay attention to physical contact. Notice 4 things you can physically feel or touch right now.',
    suggestions: [
      'My feet firmly on the floor',
      'The texture of my clothing on my skin',
      'The cool or warm air on my face',
      'The smooth surface under my hands',
      'The firmness of the chair supporting me',
      'The warmth of my hands resting together'
    ]
  },
  {
    number: 3,
    sense: 'HEAR',
    label: '3 Things You Can Hear',
    icon: Volume2,
    color: 'text-teal-500',
    badgeBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-300 border-teal-300/60 dark:border-teal-800/60',
    prompt: 'Listen closely to your surroundings. Identify 3 distinct sounds you can hear right now.',
    suggestions: [
      'Hum of an air conditioner or fan',
      'My own steady, calm breath',
      'Distant traffic or footsteps outside',
      'Birds singing outside the window',
      'Subtle ticking of a clock',
      'Gentle rustle of paper or breeze'
    ]
  },
  {
    number: 2,
    sense: 'SMELL',
    label: '2 Things You Can Smell',
    icon: Wind,
    color: 'text-amber-500',
    badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-300/60 dark:border-amber-800/60',
    prompt: 'Take a gentle breath in through your nose. Notice 2 aromas around you (or evoke a calming scent memory).',
    suggestions: [
      'Clean ambient air in the room',
      'Scent of soap or hand lotion',
      'Aroma of coffee or warm tea',
      'Freshly washed cotton clothing',
      'The soothing memory of lavender or rain',
      'The scent of wooden furniture or book pages'
    ]
  },
  {
    number: 1,
    sense: 'TASTE',
    label: '1 Thing You Can Taste or Affirm',
    icon: Sparkles,
    color: 'text-rose-500',
    badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-300/60 dark:border-rose-800/60',
    prompt: 'Notice 1 taste in your mouth (or take a mindful sip of water), and speak a grounding truth to yourself.',
    suggestions: [
      'The cool, clean taste of fresh water',
      'Lingering taste of mint or morning tea',
      'Truth: "I am safe right now in this exact moment."',
      'Truth: "My anxiety is just a temporary wave, not danger."',
      'Truth: "I am anchored, grounded, and in control."'
    ]
  }
];

export const CognitiveGrounding54321: React.FC<{
  activityName?: string;
  activityDescription?: string;
  onComplete?: (data: any) => void;
}> = ({
  activityName = 'Cognitive Grounding',
  activityDescription = 'Engage your mind with focused mental exercises like counting, naming, and sensory grounding to shift attention away from worry and anchor you in the present.',
  onComplete
}) => {
  // Activity state: isStarted controls whether activity has officially begun
  const [isStarted, setIsStarted] = useState<boolean>(false);

  // Steps: 0 = Centering Breath, 1..5 = Senses (5, 4, 3, 2, 1), 6 = Complete
  const [step, setStep] = useState<number>(0);
  const [preDistress, setPreDistress] = useState<number>(7);
  const [postDistress, setPostDistress] = useState<number>(3);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Breathing pacer cycle for step 0
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');

  // Auto-advance countdown for Step 0 (null when instruction is playing, 3..1 when transitioning)
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const instructionDoneRef = useRef<boolean>(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stepScrollRef = useRef<HTMLDivElement | null>(null);

  // Stored responses: array of strings for each of the 5 senses
  const [responses, setResponses] = useState<{ [key: number]: string[] }>({
    5: ['', '', '', '', ''],
    4: ['', '', '', ''],
    3: ['', '', ''],
    2: ['', ''],
    1: ['']
  });

  // Reset step scroll position whenever step changes
  useEffect(() => {
    if (stepScrollRef.current) {
      stepScrollRef.current.scrollTop = 0;
    }
  }, [step]);

  // Ensure NO voice is speaking upon initial mount, and cleanup on unmount
  useEffect(() => {
    try {
      audioEngine.stopSpeaking();
    } catch {}
    return () => {
      try {
        audioEngine.stopSpeaking();
      } catch {}
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  // Breathing animation cycle ONLY runs when isStarted is true and step is 0
  useEffect(() => {
    if (!isStarted || step !== 0) return;
    const interval = setInterval(() => {
      setBreathPhase((prev) => {
        if (prev === 'Inhale') return 'Hold';
        if (prev === 'Hold') return 'Exhale';
        return 'Inhale';
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isStarted, step]);

  // Step 0: Trigger 3-second transition to next step
  const start3SecondTransition = useCallback(() => {
    if (instructionDoneRef.current) return;
    instructionDoneRef.current = true;

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    setAutoAdvanceCountdown(3);
    let count = 3;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setAutoAdvanceCountdown(count);
      } else {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setAutoAdvanceCountdown(null);
        audioEngine.playSfx('tactile_tap');
        setStep(1);
      }
    }, 1000);
  }, []);

  // Step 0: Voice instruction & automatic progression
  useEffect(() => {
    if (!isStarted || step !== 0) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      setAutoAdvanceCountdown(null);
      instructionDoneRef.current = false;
      return;
    }

    instructionDoneRef.current = false;
    setAutoAdvanceCountdown(null);

    if (voiceEnabled) {
      audioEngine.speak(
        'Take a slow, deep breath in, and gently exhale. Welcome to the 5-4-3-2-1 grounding exercise.',
        () => {
          start3SecondTransition();
        }
      );
      // Safety fallback: if speech synthesis onEnd doesn't fire, transition after 8.5 seconds
      fallbackTimerRef.current = setTimeout(() => {
        start3SecondTransition();
      }, 8500);
    } else {
      // Voice is muted: allow 6 seconds for the centering breath instruction, then begin 3-second transition
      fallbackTimerRef.current = setTimeout(() => {
        start3SecondTransition();
      }, 6000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [isStarted, step, voiceEnabled, start3SecondTransition]);

  // Voice guidance coach for steps 1 to 6
  useEffect(() => {
    if (!isStarted || !voiceEnabled) return;

    if (step >= 1 && step <= 5) {
      const cfg = STEPS[step - 1];
      audioEngine.speak(`${cfg.label}. ${cfg.prompt}`);
    } else if (step === 6) {
      audioEngine.speak('Wonderful work. Take one final deep breath. You are grounded, safe, and present.');
    }
  }, [isStarted, step, voiceEnabled]);

  // Handle explicit start button click
  const handleStartActivity = () => {
    audioEngine.playSfx('sonar_ping');
    setIsStarted(true);
    setStep(0);
    setBreathPhase('Inhale');
  };

  const handleNext = () => {
    if (step >= 1 && step <= 5) {
      const cfg = STEPS[step - 1];
      const count = (responses[cfg.number] || []).filter((r) => r.trim().length > 0).length;
      if (count < cfg.number) return;
    }
    audioEngine.playSfx('tactile_tap');
    if (step < 5) {
      setStep(step + 1);
    } else if (step === 5) {
      audioEngine.playSfx('celebration_chords');
      setStep(6);
    }
  };

  const handleBack = () => {
    audioEngine.playSfx('tactile_tap');
    if (step > 0) {
      setStep(step - 1);
    } else {
      setIsStarted(false);
      audioEngine.stopSpeaking();
    }
  };

  const handleReset = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    instructionDoneRef.current = false;
    setAutoAdvanceCountdown(null);

    audioEngine.playSfx('tactile_tap');
    audioEngine.stopSpeaking();
    setIsStarted(false);
    setStep(0);
    setBreathPhase('Inhale');
    setPreDistress(7);
    setPostDistress(3);
    setResponses({
      5: ['', '', '', '', ''],
      4: ['', '', '', ''],
      3: ['', '', ''],
      2: ['', ''],
      1: ['']
    });
  };

  const handleItemChange = (stepNum: number, index: number, value: string) => {
    setResponses((prev) => {
      const list = [...(prev[stepNum] || [])];
      list[index] = value;
      return { ...prev, [stepNum]: list };
    });
  };

  const handleApplySuggestion = (stepNum: number, text: string) => {
    audioEngine.playSfx('sonar_ping');
    setResponses((prev) => {
      const list = [...(prev[stepNum] || [])];
      const emptyIdx = list.findIndex((item) => !item.trim());
      if (emptyIdx !== -1) {
        list[emptyIdx] = text;
      } else {
        list[list.length - 1] = text;
      }
      return { ...prev, [stepNum]: list };
    });
  };

  const handleCopySummary = () => {
    const summary = `🌿 5-4-3-2-1 Sensory Grounding Summary
• Initial Distress: ${preDistress}/10 ➔ Post-Grounding: ${postDistress}/10 (-${Math.max(0, preDistress - postDistress)} pts)

👁️ 5 Things I Saw:
${responses[5].map((s, i) => `  ${i + 1}. ${s || '(Observed)'}`).join('\n')}

✋ 4 Things I Touched:
${responses[4].map((s, i) => `  ${i + 1}. ${s || '(Felt)'}`).join('\n')}

👂 3 Things I Heard:
${responses[3].map((s, i) => `  ${i + 1}. ${s || '(Heard)'}`).join('\n')}

🌸 2 Things I Smelled:
${responses[2].map((s, i) => `  ${i + 1}. ${s || '(Smelled)'}`).join('\n')}

✨ 1 Thing I Tasted / Affirmed:
  1. ${responses[1][0] || '(Affirmed)'}

Completed via Hexpertify Clinical Grounding`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    audioEngine.playSfx('tactile_tap');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFinish = () => {
    audioEngine.playSfx('celebration_chords');
    const reliefPct = Math.round((Math.max(0, preDistress - postDistress) / Math.max(1, preDistress)) * 100);
    if (onComplete) {
      onComplete({
        score: 100,
        preDistress,
        postDistress,
        reliefPercentage: reliefPct,
        responses,
        completedAt: new Date().toISOString()
      });
    }
  };

  const reliefPercent = Math.max(0, Math.round(((preDistress - postDistress) / Math.max(1, preDistress)) * 100));
  const currentStepCfg = step >= 1 && step <= 5 ? STEPS[step - 1] : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 font-['Plus_Jakarta_Sans',sans-serif] text-slate-800 dark:text-slate-100 select-none">
      {/* ── CARD CONTAINER (CONSTANT HEIGHT ACROSS ALL STEPS) ── */}
      <div className="w-full min-h-[380px] sm:h-[395px] flex flex-col justify-between bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-purple-500/5 p-3.5 sm:py-4 sm:px-6 relative overflow-hidden transition-all">
        {/* Ambient Floating Glows */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[#5e2be2]/5 dark:bg-[#5e2be2]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-teal-500/5 dark:bg-teal-500/10 blur-3xl pointer-events-none" />

        {/* ─────────────────────────────────────────────────────────────
            STAGE 1: PRE-START / READY OVERVIEW SCREEN (Before activity begins)
           ───────────────────────────────────────────────────────────── */}
        {!isStarted ? (
          <div className="flex-1 flex flex-col justify-between animate-fadeIn py-0.5 z-10 w-full">
            {/* Top Header Bar: Voice Toggle Only */}
            <div className="w-full flex items-center justify-end z-10 pb-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const next = !voiceEnabled;
                  setVoiceEnabled(next);
                  audioEngine.setVoiceEnabled(next);
                  if (!next) audioEngine.stopSpeaking();
                  audioEngine.playSfx('tactile_tap');
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  voiceEnabled
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
                title={voiceEnabled ? 'Voice Guidance Enabled' : 'Voice Guidance Muted'}
              >
                {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#5e2be2]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                <span>{voiceEnabled ? 'Voice On' : 'Muted'}</span>
              </button>
            </div>

            {/* Main Stage 1 Content: Overview */}
            <div className="flex-1 flex flex-col justify-center items-center max-w-xl mx-auto w-full gap-5 my-auto z-10 text-center">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Anchor Your Senses in the Present Moment
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Follow guided sensory observations to quiet acute anxiety and downregulate your nervous system.
                </p>
              </div>

              {/* 5-Sense Visual Flow Map */}
              <div className="grid grid-cols-5 gap-2.5 sm:gap-3 w-full max-w-lg">
                {STEPS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.number}
                      className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 transition-all hover:border-[#5e2be2]/30 group"
                    >
                      <div className={`w-9 h-9 rounded-xl ${s.badgeBg} flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105 shadow-xs`}>
                        <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${s.color}`} />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">{s.number}</span>
                        <span className="text-[10px] sm:text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{s.sense}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Start Button */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleStartActivity}
                  className="px-8 py-2.5 rounded-full bg-[#5e2be2] hover:bg-[#4f28d9] text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Grounding</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
              STAGE 2: ACTIVE 5-4-3-2-1 GROUNDING JOURNEY
             ───────────────────────────────────────────────────────────── */
          <div className="flex-1 flex flex-col justify-between animate-fadeIn z-10 w-full overflow-hidden">
            {/* Top Header Bar: Clean & Minimal (Voice Toggle & Reset Only) */}
            <div className="w-full flex items-center justify-end z-10 pb-0.5 shrink-0 gap-2">
              {/* Voice Toggle & Reset */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const next = !voiceEnabled;
                    setVoiceEnabled(next);
                    audioEngine.setVoiceEnabled(next);
                    if (!next) audioEngine.stopSpeaking();
                    audioEngine.playSfx('tactile_tap');
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    voiceEnabled
                      ? 'bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                  title={voiceEnabled ? 'Voice Guidance Active' : 'Voice Muted'}
                >
                  {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#5e2be2]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                  <span className="hidden sm:inline">{voiceEnabled ? 'Voice On' : 'Muted'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 text-slate-400 hover:text-[#5e2be2] bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 rounded-full transition-all cursor-pointer"
                  title="Reset session"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── STEP 0: CENTERING BREATH ── */}
            {step === 0 && (
              <div className="flex-1 flex flex-col justify-between animate-fadeIn py-1 overflow-hidden">
                {/* Centered Breathing Sphere */}
                <div className="flex-1 flex flex-col items-center justify-center text-center my-auto space-y-3">
                  <div className="flex items-center justify-center py-1">
                    <div
                      className={`w-44 h-44 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center transition-all duration-1000 border-4 shadow-xl relative px-4 ${
                        breathPhase === 'Inhale'
                          ? 'scale-105 bg-gradient-to-tr from-sky-400/20 via-indigo-500/20 to-sky-300/30 border-sky-400/80 shadow-sky-400/25'
                          : breathPhase === 'Hold'
                          ? 'scale-100 bg-gradient-to-tr from-indigo-400/20 via-purple-500/25 to-pink-400/20 border-purple-400/80 shadow-purple-400/25'
                          : 'scale-95 bg-gradient-to-tr from-teal-400/20 via-emerald-500/25 to-teal-300/20 border-teal-400/80 shadow-teal-400/25'
                      }`}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Paced Breath
                      </span>
                      <span
                        className={`text-2xl sm:text-[26px] font-black capitalize mt-1 tracking-tight whitespace-nowrap transition-colors duration-500 ${
                          breathPhase === 'Inhale'
                            ? 'text-indigo-900 dark:text-indigo-200'
                            : breathPhase === 'Hold'
                            ? 'text-purple-900 dark:text-purple-200'
                            : 'text-teal-900 dark:text-teal-200'
                        }`}
                      >
                        {breathPhase === 'Inhale' && 'Breathe In'}
                        {breathPhase === 'Hold' && 'Hold Gently'}
                        {breathPhase === 'Exhale' && 'Exhale Slowly'}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 transition-colors duration-500">
                        {breathPhase === 'Inhale' ? 'Lungs expand' : breathPhase === 'Hold' ? 'Rest in stillness' : 'Release tension'}
                      </span>
                    </div>
                  </div>

                  {/* Somatic Directive Pill */}
                  <div className="text-center">
                    {autoAdvanceCountdown !== null ? (
                      <span className="text-[11px] font-semibold text-[#5e2be2] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-3.5 py-1 rounded-full inline-flex items-center gap-1.5 border border-purple-200 dark:border-purple-800 animate-pulse">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Centering complete · Moving to next step in {autoAdvanceCountdown}s...</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-full inline-block border border-slate-200 dark:border-slate-700">
                        Follow the gentle expansion to center and ground your attention.
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer with Restart on left, auto-advance countdown on right (No Next button) */}
                <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restart</span>
                  </button>

                  {autoAdvanceCountdown !== null ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#5e2be2] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-3.5 py-1.5 rounded-xl border border-purple-200/80 dark:border-purple-800/80 animate-pulse">
                      <span>Step 1 in {autoAdvanceCountdown}s</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                      Auto-advances after instruction
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── STEPS 1 TO 5: SENSORY COUNTDOWN (NO SCROLLING - FITS FULLY) ── */}
            {step >= 1 && step <= 5 && currentStepCfg && (() => {
              const stepCount = (responses[currentStepCfg.number] || []).filter((r) => r.trim().length > 0).length;
              const isStepComplete = stepCount >= currentStepCfg.number;

              return (
                <div className="flex-1 flex flex-col justify-between animate-fadeIn overflow-hidden pt-0.5">
                  <div className="flex-1 flex flex-col justify-between space-y-1.5 overflow-hidden">
                    {/* Step Header */}
                    <div className="flex items-center justify-between gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-inner shrink-0 ${currentStepCfg.badgeBg}`}>
                          {currentStepCfg.number}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                              Step {step} of 5
                            </span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${currentStepCfg.badgeBg}`}>
                              {currentStepCfg.sense}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {currentStepCfg.label}
                          </h3>
                        </div>
                      </div>

                      {/* Recorded Count */}
                      <div className="text-right shrink-0">
                        <span className="text-[9.5px] font-semibold text-slate-400">Recorded:</span>
                        <div className={`text-xs font-black ${isStepComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#5e2be2] dark:text-purple-300'}`}>
                          {stepCount} / {currentStepCfg.number}
                        </div>
                      </div>
                    </div>

                    {/* Instruction Prompt */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug shrink-0">
                      {currentStepCfg.prompt}
                    </p>

                    {/* Response Input Slots */}
                    <div className={`shrink-0 ${currentStepCfg.number >= 3 ? "grid grid-cols-1 sm:grid-cols-2 gap-1.5" : "space-y-1.5"}`}>
                      {Array.from({ length: currentStepCfg.number }).map((_, idx) => {
                        const val = responses[currentStepCfg.number]?.[idx] || '';
                        return (
                          <div key={idx} className="relative flex items-center">
                            <span className="absolute left-2.5 text-[11px] font-bold text-slate-400 select-none">
                              #{idx + 1}
                            </span>
                            <input
                              id={`grounding-input-${currentStepCfg.number}-${idx}`}
                              type="text"
                              value={val}
                              onChange={(e) => handleItemChange(currentStepCfg.number, idx, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const nextIdx = idx + 1;
                                  if (nextIdx < currentStepCfg.number) {
                                    const nextEl = document.getElementById(`grounding-input-${currentStepCfg.number}-${nextIdx}`);
                                    if (nextEl) nextEl.focus();
                                  } else if (isStepComplete) {
                                    handleNext();
                                  }
                                }
                              }}
                              placeholder={`Observation #${idx + 1}...`}
                              className="w-full pl-8 pr-7 py-1 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-[#5e2be2] focus:outline-none transition-all shadow-2xs"
                            />
                            {val.trim() && (
                              <span className="absolute right-2 text-emerald-500">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Suggestions Row (Single-line, fits in without stacking or scrolling) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Ideas:
                      </span>
                      {currentStepCfg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleApplySuggestion(currentStepCfg.number, sug)}
                          className="px-2 py-0.5 rounded-lg text-[10.5px] font-medium bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/60 text-slate-600 dark:text-slate-300 hover:text-[#5e2be2] border border-slate-200/70 dark:border-slate-700 transition-all cursor-pointer whitespace-nowrap shrink-0"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Navigation Footer pinned to bottom: Restart on left, Next on right */}
                  <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restart</span>
                    </button>

                    <button
                      type="button"
                      disabled={!isStepComplete}
                      onClick={handleNext}
                      className={`px-5 py-2 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 ${
                        isStepComplete
                          ? 'bg-[#5e2be2] hover:bg-[#4d22be] text-white shadow-purple-500/25 transform hover:scale-[1.01] cursor-pointer'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60 shadow-none'
                      }`}
                      title={isStepComplete ? 'Proceed to next step' : `Enter all ${currentStepCfg.number} items to proceed`}
                    >
                      <span>
                        {step === 5 ? 'Finish & View Blueprint' : `Next (${STEPS[step]?.sense || ''})`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── STEP 6: GROUNDING SUMMARY ── */}
            {step === 6 && (
              <div className="flex-1 flex flex-col justify-between animate-fadeIn py-1 overflow-hidden">
                <div className="space-y-3 overflow-y-auto max-h-[310px] pr-1">
                  <div className="text-center max-w-lg mx-auto space-y-1">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 mx-auto flex items-center justify-center shadow-inner">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      Senses Re-Anchored in Present Reality
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      You engaged all 5 senses to interrupt panic and bring your prefrontal cortex back online.
                    </p>
                  </div>

                  {/* Before vs After Distress Shift */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-emerald-50/40 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-emerald-950/40 border border-purple-200/80 dark:border-purple-800/60 space-y-2">
                    <div className="flex items-center justify-around gap-4 text-center">
                      <div>
                        <span className="text-[9.5px] font-bold uppercase text-slate-400 block">Initial</span>
                        <div className="text-lg font-black text-rose-500">{preDistress} / 10</div>
                      </div>

                      <div className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          📉 {reliefPercent}% Relief
                        </span>
                      </div>

                      <div>
                        <span className="text-[9.5px] font-bold uppercase text-slate-400 block">Post-Grounding</span>
                        <div className="text-lg font-black text-emerald-600">{postDistress} / 10</div>
                      </div>
                    </div>

                    {/* Post Slider */}
                    <div className="space-y-1 pt-1.5 border-t border-purple-100 dark:border-purple-900/50">
                      <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>Re-evaluate distress right now:</span>
                        <span className="font-bold text-[#5e2be2]">{postDistress} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={postDistress}
                        onChange={(e) => setPostDistress(Number(e.target.value))}
                        className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Sensory Blueprint Grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Present-Moment Sensory Blueprint:
                      </span>
                      <button
                        type="button"
                        onClick={handleCopySummary}
                        className="text-xs font-semibold text-[#5e2be2] dark:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {STEPS.map((s) => {
                        const items = (responses[s.number] || []).filter((r) => r.trim().length > 0);
                        const StepIcon = s.icon;
                        return (
                          <div
                            key={s.number}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black ${s.badgeBg}`}>
                                {s.number}
                              </span>
                              <StepIcon className={`w-3 h-3 ${s.color}`} />
                              <span className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                                {s.sense}
                              </span>
                            </div>
                            <ul className="space-y-0.5">
                              {items.length === 0 ? (
                                <li className="text-[10px] text-slate-400 italic">Anchored</li>
                              ) : (
                                items.map((it, i) => (
                                  <li key={i} className="text-[10px] text-slate-600 dark:text-slate-300 flex items-start gap-1 truncate">
                                    <span className="text-emerald-500 font-bold">•</span>
                                    <span className="truncate">{it}</span>
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions pinned to bottom */}
                <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restart</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinish}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all transform hover:scale-[1.01] cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save & Complete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EDUCATIONAL DESCRIPTION CARD: What is Cognitive Grounding?
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xl shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Section 1: Overview */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            What is Cognitive Grounding?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal text-justify">
            Cognitive Grounding is an evidence-based neuropsychological intervention designed to interrupt acute anxiety, panic escalation, and intrusive rumination loops. When emotional distress spikes, the brain's <strong>limbic system (amygdala)</strong> consumes neural bandwidth, triggering fight-or-flight reactions. By deliberately engaging in high-demand, structured sensory observation and executive tracking—cycling through sight, touch, sound, smell, and taste—the 5-4-3-2-1 technique activates the <strong>dorsolateral prefrontal cortex (dlPFC)</strong>. Through competitive neuro-metabolic recruitment, neural activation is redirected away from panic circuits back toward rational executive control.
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
              The 5-4-3-2-1 sensory countdown systematically activates primary sensory cortices in sequence:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  1
                </span>
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider">
                  Sensory Redirection (5-4-3)
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Actively scanning your physical environment for 5 visual objects, 4 tactile sensations, and 3 distinct sounds engages the occipital, somatosensory, and auditory cortices, breaking internal fear loops.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  2
                </span>
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider">
                  Olfactory & Affirmation (2-1)
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Identifying 2 aromas stimulates the olfactory system directly linked to emotional regulation. Savoring 1 taste and affirming a core truth anchors your mind in unshakeable safety.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  3
                </span>
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider">
                  Reality Re-Anchoring
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Observing concrete sensory landmarks in your room signals directly to the autonomic nervous system that you are physically secure in the present moment, dissipating catastrophic phantom alarms.
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
              Evidence-based neurological outcomes of 5-4-3-2-1 sensory grounding:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Brain className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">De-escalates Limbic Hijack</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Competitively redirects cerebral blood flow away from the hyperactive amygdala and toward the dorsolateral prefrontal cortex.
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
                  Demands instantaneous working-memory bandwidth, making it biologically impossible to maintain repetitive catastrophic narratives simultaneously.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Restores Executive Control</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Strengthens cognitive stamina and restores sharp focus, enabling rational decision-making during high-pressure or emotional situations.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Rapid Somatosensory Calming</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Pairing concrete sensory observation with paced centering breathing swiftly down-regulates sympathetic nervous system overdrive within 60 to 90 seconds.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Closing Takeaway */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-purple-500/10 border border-purple-200/80 dark:border-purple-800/60 flex items-start gap-3.5">
          <div className="w-7 h-7 rounded-full bg-[#5e2be2] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium text-justify">
            <strong>Clinical Rule of Thumb:</strong> When in severe emotional overwhelm or panic, do not attempt to reason with catastrophic thoughts. Anchor your five physical senses with 5-4-3-2-1 first. Once physiology settles, cognitive clarity follows naturally.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CognitiveGrounding54321;
