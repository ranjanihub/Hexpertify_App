import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Heart,
  Volume2,
  VolumeX,
  Coffee,
  Eye,
  Hand,
  Check,
  Play,
  Pause,
  ArrowRight,
  ArrowLeft,
  Shield,
  Wind,
  Brain,
  Target,
  ShieldCheck,
  Compass,
  Zap
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';
import { audioEngine } from '../utils/therapeuticAudioEngine';

export const MoodLiftSomaticPlayer: React.FC<BaseActivityComponentProps> = ({
  activityId = 'ACT-08',
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

  if (activityId === 'ACT-08') {
    return <BiomechanicalPostureHUD activityName={activityName} onComplete={onComplete} />;
  } else {
    return <DbtMultiSensoryComfortMatrix activityName={activityName} onComplete={onComplete} />;
  }
};

/* ─────────────────────────────────────────────────────────────
   ACT-08: POSTURE RESET (Somatic Alignment & Neuromuscular Grounding)
   Reference: https://moodlift.hexpertify.com/games/posture-reset
   ───────────────────────────────────────────────────────────── */
interface PostureStepConfig {
  id: number;
  title: string;
  instruction: string;
  voice: string;
  duration: number;
  tag: string;
  focusArea: string;
  imgUrl?: string;
  visualType: 'position' | 'shoulders' | 'chest' | 'jaw' | 'hands' | 'spine' | 'breath';
}

const POSTURE_STEPS: PostureStepConfig[] = [
  {
    id: 1,
    title: 'Position',
    instruction: 'Sit or stand tall. Imagine a string lifting the crown of your head upward.',
    voice: 'Sit or stand tall. Imagine a string gently lifting the crown of your head upward.',
    duration: 6,
    tag: 'CRANIAL AXIS',
    focusArea: 'Head Crown & Vertical Axis',
    imgUrl: '/images/postures/posture_1.jpg',
    visualType: 'position'
  },
  {
    id: 2,
    title: 'Shoulder Reset',
    instruction: 'Roll your shoulders up… back… and down. Feel the tension release.',
    voice: 'Roll your shoulders up, back, and down. Feel the accumulated tension melt away.',
    duration: 6,
    tag: 'SCAPULAR DEPRESSION',
    focusArea: 'Trapezius & Shoulder Blades',
    imgUrl: '/images/postures/posture_2.jpg',
    visualType: 'shoulders'
  },
  {
    id: 3,
    title: 'Chest Alignment',
    instruction: 'Lift your chest slightly. Open your shoulders wide, sitting tall and proud.',
    voice: 'Lift your chest slightly and open your shoulders wide, sitting tall and proud.',
    duration: 6,
    tag: 'THORACIC EXPANSION',
    focusArea: 'Pectorals & Sternum Opening',
    imgUrl: '/images/postures/posture_3.jpg',
    visualType: 'chest'
  },
  {
    id: 4,
    title: 'Jaw Relaxation',
    instruction: 'Relax your jaw and soften your facial muscles. Let your shoulders drop.',
    voice: 'Unclench your jaw and soften your facial muscles. Let your shoulders drop.',
    duration: 6,
    tag: 'FACIAL RELEASE',
    focusArea: 'Masseter & Facial Softening',
    imgUrl: '/images/postures/posture_4.jpg',
    visualType: 'jaw'
  },
  {
    id: 5,
    title: 'Hand Release',
    instruction: 'Unclench your hands and let your arms rest naturally at your sides.',
    voice: 'Unclench your hands and let your arms rest naturally at your sides.',
    duration: 6,
    tag: 'PALM RELAXATION',
    focusArea: 'Palms & Finger Flexors',
    imgUrl: '/images/postures/posture_5.jpg',
    visualType: 'hands'
  },
  {
    id: 6,
    title: 'Spine Alignment',
    instruction: 'Feel your entire spine lengthening. Align your head over your shoulders, shoulders over your hips.',
    voice: 'Feel your entire spine lengthening. Align your head over your shoulders, and shoulders over your hips.',
    duration: 6,
    tag: 'AXIAL LENGTHENING',
    focusArea: 'Vertebral Column Alignment',
    imgUrl: '/images/postures/posture_6.jpg',
    visualType: 'spine'
  },
  {
    id: 7,
    title: 'Deep Breath',
    instruction: 'Take one slow deep breath in… hold for a moment… and slowly exhale. Feel the alignment.',
    voice: 'Take one slow deep breath in... hold for a moment... and slowly exhale, feeling the alignment.',
    duration: 6,
    tag: 'INTEGRATED BREATH',
    focusArea: '360° Diaphragmatic Breath',
    imgUrl: '/images/postures/posture_7.jpg',
    visualType: 'breath'
  }
];

/* ─────────────────────────────────────────────────────────────
   VISUAL SOMATIC REFERENCE ILLUSTRATION COMPONENT
   AI 3D Cartoon Character Illustrations matching each posture
   ───────────────────────────────────────────────────────────── */
function PostureVisualGuide({ step }: { step: PostureStepConfig }) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [step.id]);

  // Primary: 3D Cartoon Character Image (Steps 1, 2, 3, 4, 5, 6, 7)
  if (step.imgUrl && !imgFailed) {
    return (
      <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-gradient-to-tr from-purple-100 to-indigo-50 dark:bg-slate-900 shadow-md shadow-purple-900/15 border-2 border-white/60 dark:border-purple-400/40 flex items-center justify-center group transition-all shrink-0">
        <img
          src={step.imgUrl}
          alt={step.title}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
        />
      </div>
    );
  }

  // 3D Cartoon Character Vector Guides
  return (
    <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-br from-[#2a1357] via-[#1c1444] to-[#0f1126] border border-purple-400/40 shadow-md flex flex-col items-center justify-between p-2 text-white overflow-hidden group shrink-0">
      {/* Background Soft Ambient Light */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#5e2be2]/30 via-transparent to-purple-300/10 pointer-events-none" />

      {/* STEP 4: CUTE 3D CARTOON AVATAR - JAW RELAXATION */}
      {step.visualType === 'jaw' && (
        <div className="flex-1 w-full flex flex-col items-center justify-center relative">
          <svg viewBox="0 0 140 140" className="w-24 h-24">
            <defs>
              <radialGradient id="faceGrad" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#fed7aa" />
                <stop offset="100%" stopColor="#fba36e" />
              </radialGradient>
              <radialGradient id="hoodieGrad" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#5e2be2" />
              </radialGradient>
            </defs>

            {/* Dropped Relaxed Shoulders */}
            <path d="M25 125 Q70 95 115 125 L115 140 L25 140 Z" fill="url(#hoodieGrad)" />
            <path d="M70 100 L70 140" stroke="#4c1d95" strokeWidth="2.5" />

            {/* 3D Cartoon Character Head */}
            <circle cx="70" cy="62" r="34" fill="url(#faceGrad)" />

            {/* Cute Cartoon Hair */}
            <path d="M38 55 Q70 20 102 55 Q90 32 70 34 Q50 32 38 55 Z" fill="#471b05" />

            {/* Serene Closed Cartoon Eyes */}
            <path d="M52 58 Q58 64 64 58" stroke="#451a03" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M76 58 Q82 64 88 58" stroke="#451a03" strokeWidth="3" fill="none" strokeLinecap="round" />

            {/* Soft Rosy Cheeks */}
            <circle cx="48" cy="68" r="6" fill="#f43f5e" fillOpacity="0.35" />
            <circle cx="92" cy="68" r="6" fill="#f43f5e" fillOpacity="0.35" />

            {/* Soft Relaxed Open Smile / Unclenched Jaw */}
            <path d="M62 74 Q70 82 78 74" stroke="#78350f" strokeWidth="2.5" fill="#fbcfe8" strokeLinecap="round" />

            {/* Green Jaw Relaxation Aura */}
            <circle cx="70" cy="78" r="16" fill="#10b981" fillOpacity="0.2" className="animate-pulse" />
            <path d="M70 86 L70 98" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
            <polygon points="70,101 67,95 73,95" fill="#34d399" />
          </svg>
          <div className="absolute top-0 right-0 bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-[8px] font-black px-1.5 py-0.5 rounded-full">
            👄 Relaxed Jaw
          </div>
        </div>
      )}

      {/* STEP 5: CUTE 3D CARTOON AVATAR - HAND RELEASE */}
      {step.visualType === 'hands' && (
        <div className="flex-1 w-full flex flex-col items-center justify-center relative">
          <svg viewBox="0 0 140 140" className="w-24 h-24">
            <defs>
              <linearGradient id="handGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fed7aa" />
                <stop offset="100%" stopColor="#fba36e" />
              </linearGradient>
            </defs>

            {/* Relaxed Seated Character Body */}
            <ellipse cx="70" cy="115" rx="42" ry="20" fill="#5e2be2" />

            {/* Pair of 3D Cartoon Open Resting Hands */}
            <g transform="translate(42, 75)">
              <ellipse cx="0" cy="0" rx="14" ry="9" fill="url(#handGrad)" />
              <circle cx="-6" cy="-8" r="3.5" fill="#fed7aa" />
              <circle cx="-1" cy="-10" r="3.5" fill="#fed7aa" />
              <circle cx="4" cy="-10" r="3.5" fill="#fed7aa" />
              <circle cx="9" cy="-8" r="3.5" fill="#fed7aa" />
              <circle cx="0" cy="0" r="10" fill="#fbbf24" fillOpacity="0.3" className="animate-ping duration-[2500ms]" />
            </g>

            <g transform="translate(98, 75)">
              <ellipse cx="0" cy="0" rx="14" ry="9" fill="url(#handGrad)" />
              <circle cx="-9" cy="-8" r="3.5" fill="#fed7aa" />
              <circle cx="-4" cy="-10" r="3.5" fill="#fed7aa" />
              <circle cx="1" cy="-10" r="3.5" fill="#fed7aa" />
              <circle cx="6" cy="-8" r="3.5" fill="#fed7aa" />
              <circle cx="0" cy="0" r="10" fill="#fbbf24" fillOpacity="0.3" className="animate-ping duration-[2500ms]" />
            </g>

            {/* Glowing Golden Sparkles */}
            <path d="M70 38 Q70 48 78 48 Q70 48 70 58 Q70 48 62 48 Q70 48 70 38" fill="#fde047" className="animate-pulse" />
          </svg>
          <div className="absolute top-0 right-0 bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[8px] font-black px-1.5 py-0.5 rounded-full">
            ✋ Open Palms
          </div>
        </div>
      )}

      {/* STEP 6: CUTE 3D CARTOON AVATAR - SPINE ALIGNMENT */}
      {step.visualType === 'spine' && (
        <div className="flex-1 w-full flex flex-col items-center justify-center relative">
          <svg viewBox="0 0 140 140" className="w-24 h-24">
            <defs>
              <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>
            </defs>

            {/* Upright Plumb Alignment Beam */}
            <line x1="70" y1="8" x2="70" y2="132" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" className="animate-pulse" />
            
            {/* Glowing Golden Crown Star */}
            <polygon points="70,6 72,12 78,12 73,15 75,21 70,17 65,21 67,15 62,12 68,12" fill="#fbbf24" className="animate-bounce" />

            {/* 3D Character Head */}
            <circle cx="70" cy="34" r="15" fill="#fed7aa" />
            <path d="M57 32 Q70 16 83 32 Q77 22 70 23 Q63 22 57 32 Z" fill="#471b05" />
            <circle cx="65" cy="34" r="1.5" fill="#451a03" />
            <circle cx="75" cy="34" r="1.5" fill="#451a03" />
            <path d="M67 39 Q70 42 73 39" stroke="#78350f" strokeWidth="1.5" fill="none" strokeLinecap="round" />

            {/* 3D Aligned Torso & Spine */}
            <rect x="58" y="52" width="24" height="42" rx="12" fill="url(#bodyGrad)" />

            {/* Alignment Beads along spine */}
            <circle cx="70" cy="58" r="3.5" fill="#38bdf8" />
            <circle cx="70" cy="72" r="3.5" fill="#a855f7" />
            <circle cx="70" cy="86" r="3.5" fill="#ec4899" />

            {/* Seated Leg Base */}
            <ellipse cx="70" cy="110" rx="30" ry="10" fill="#312e81" />
          </svg>
          <div className="absolute top-0 right-0 bg-purple-500/30 border border-purple-400/50 text-purple-200 text-[8px] font-black px-1.5 py-0.5 rounded-full">
            ✨ Aligned Spine
          </div>
        </div>
      )}

      {/* STEP 7: CUTE 3D CARTOON AVATAR - DEEP BREATH */}
      {step.visualType === 'breath' && (
        <div className="flex-1 w-full flex flex-col items-center justify-center relative">
          <svg viewBox="0 0 140 140" className="w-24 h-24">
            <defs>
              <radialGradient id="breathAura" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Expanding 3D Breath Aura */}
            <circle cx="70" cy="70" r="48" fill="url(#breathAura)" className="animate-ping duration-[3500ms]" />
            <circle cx="70" cy="70" r="38" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" fill="none" className="animate-spin duration-[12000ms]" />

            {/* Cute Meditating Character */}
            <circle cx="70" cy="46" r="16" fill="#fed7aa" />
            <path d="M56 44 Q70 26 84 44 Q77 34 70 35 Q63 34 56 44 Z" fill="#471b05" />
            <path d="M62 45 Q65 48 68 45" stroke="#451a03" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M72 45 Q75 48 78 45" stroke="#451a03" strokeWidth="2" fill="none" strokeLinecap="round" />

            <rect x="56" y="64" width="28" height="34" rx="14" fill="#0284c7" />
            <circle cx="66" cy="76" r="5" fill="#fed7aa" />
            <circle cx="74" cy="76" r="5" fill="#fed7aa" />

            {/* Glowing Heart Center */}
            <circle cx="70" cy="76" r="8" fill="#38bdf8" fillOpacity="0.5" className="animate-pulse" />
          </svg>
          <div className="absolute top-0 right-0 bg-sky-500/30 border border-sky-400/50 text-sky-200 text-[8px] font-black px-1.5 py-0.5 rounded-full">
            🌬️ Deep Breath
          </div>
        </div>
      )}
    </div>
  );
}

function BiomechanicalPostureHUD({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(6);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [gapSeconds, setGapSeconds] = useState<number>(3);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [completedStepIds, setCompletedStepIds] = useState<number[]>([]);
  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;

  const currentStep = POSTURE_STEPS[currentStepIndex] || POSTURE_STEPS[0];
  const isLastStep = currentStepIndex === POSTURE_STEPS.length - 1;

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    voiceEnabledRef.current = next;
    audioEngine.setVoiceEnabled(next);
    if (!next) {
      audioEngine.pauseSpeaking();
    } else if (isPlaying && !isCompleted) {
      audioEngine.resumeSpeaking();
    }
  };

  // Auto-advancing countdown timer with 3-second transition gap between steps
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !isCompleted) {
      interval = setInterval(() => {
        if (!isTransitioning) {
          setCountdownSeconds((prev) => {
            if (prev <= 1) {
              setCompletedStepIds((existing) => (existing.includes(currentStep.id) ? existing : [...existing, currentStep.id]));
              if (currentStepIndex < POSTURE_STEPS.length - 1) {
                setIsTransitioning(true);
                setGapSeconds(3);
                return 0;
              } else {
                setIsPlaying(false);
                setIsCompleted(true);
                audioEngine.playSfx('celebration_chords');
                if (voiceEnabledRef.current) {
                  audioEngine.speak('Posture reset complete. Your spine is aligned, relaxed, and open.');
                }
                if (onComplete) onComplete({ completed: true });
                return 0;
              }
            }
            return prev - 1;
          });
        } else {
          setGapSeconds((prevGap) => {
            if (prevGap <= 1) {
              setIsTransitioning(false);
              const nextIdx = currentStepIndex + 1;
              setCurrentStepIndex(nextIdx);
              const nextDuration = POSTURE_STEPS[nextIdx]?.duration || 6;
              setCountdownSeconds(nextDuration);
              if (voiceEnabledRef.current) {
                audioEngine.speak(`${POSTURE_STEPS[nextIdx].title}. ${POSTURE_STEPS[nextIdx].voice || POSTURE_STEPS[nextIdx].instruction}`);
              }
              return 0;
            }
            return prevGap - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, isTransitioning, currentStepIndex, currentStep.id, onComplete]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      audioEngine.stopSpeaking();
    };
  }, []);

  const handleStartOrResume = () => {
    audioEngine.playSfx('tactile_tap');
    if (voiceEnabledRef.current) {
      if (countdownSeconds === 6 && !isTransitioning) {
        audioEngine.speak(`${currentStep.title}. ${currentStep.voice || currentStep.instruction}`);
      } else {
        audioEngine.resumeSpeaking();
      }
    }
    setIsPlaying(true);
    setIsCompleted(false);
  };

  const handlePause = () => {
    audioEngine.playSfx('tactile_tap');
    audioEngine.pauseSpeaking();
    setIsPlaying(false);
  };

  const handleSelectStep = (idx: number) => {
    audioEngine.playSfx('tactile_tap');
    setCurrentStepIndex(idx);
    setIsTransitioning(false);
    setCountdownSeconds(POSTURE_STEPS[idx].duration || 6);
    if (isPlaying && voiceEnabledRef.current) {
      audioEngine.speak(`${POSTURE_STEPS[idx].title}. ${POSTURE_STEPS[idx].voice || POSTURE_STEPS[idx].instruction}`);
    }
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    audioEngine.stopSpeaking(true);
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setIsTransitioning(false);
    setGapSeconds(3);
    setCountdownSeconds(6);
    setCompletedStepIds([]);
    setIsCompleted(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ─────────────────────────────────────────────────────────────
          1. MAIN INTERACTIVE POSTURE RESET STAGE
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-3xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xl shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 relative overflow-hidden font-['Plus_Jakarta_Sans'] flex flex-col justify-between p-3.5 sm:p-5 sm:px-6 select-none">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-[#5e2be2]/5 dark:bg-[#5e2be2]/10 blur-3xl pointer-events-none" />

        {/* Top Header Bar (Voice Toggle Only) */}
        <div className="w-full flex items-center justify-end z-10 pb-0.5">
          <button
            onClick={handleToggleVoice}
            className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 transition-all cursor-pointer flex items-center gap-1.5"
            title="Toggle Voice Guidance"
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#5e2be2]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span>{voiceEnabled ? 'Voice On' : 'Muted'}</span>
          </button>
        </div>

        {!isCompleted ? (
          /* ACTIVE EXERCISE SCREEN */
          <div className="max-w-xl mx-auto text-center space-y-2.5 py-1 animate-fade-in z-10 w-full">
            {/* Step Counter Pill */}
            <div className="space-y-0.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-block">
                Step {currentStepIndex + 1} of 7: {currentStep.title}
              </span>
            </div>

            {/* Centered Visual Guide + Hold/Transition Timer Pill */}
            <div className="flex flex-col items-center justify-center gap-2 py-1">
              <PostureVisualGuide step={currentStep} />
              <div>
                {isPlaying ? (
                  isTransitioning ? (
                    <span className="px-3.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse flex items-center gap-1.5 shadow-2xs">
                      🌿 Next posture in {gapSeconds}s...
                    </span>
                  ) : (
                    <span className="px-3.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200 dark:border-purple-800 animate-pulse flex items-center gap-1.5">
                      ⏱️ Hold posture: {countdownSeconds}s remaining
                    </span>
                  )
                ) : !isPlaying && countdownSeconds === 6 && currentStepIndex === 0 && !isTransitioning ? (
                  <span className="px-3.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs">
                    ✨ Ready to begin (6s hold)
                  </span>
                ) : (
                  <span className="px-3.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    Paused ({isTransitioning ? `Transitioning in ${gapSeconds}s` : `${countdownSeconds}s remaining`})
                  </span>
                )}
              </div>
            </div>

            {/* Step Instruction Card */}
            <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-2xs max-w-md mx-auto">
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                {currentStep.instruction}
              </p>
            </div>
          </div>
        ) : (
          /* COMPLETION CELEBRATION */
          <div className="max-w-lg mx-auto text-center space-y-3 py-3 my-auto animate-fade-in z-10 w-full">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 p-1 mx-auto flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#5e2be2] flex items-center justify-center text-white shadow-md shadow-purple-500/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Posture Reset Completed
              </h3>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#5e2be2] dark:text-purple-300 mt-0.5">
                Neuromuscular Alignment Restored
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/50 border-l-4 border-[#5e2be2] p-3 rounded-xl text-left shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5e2be2] dark:text-purple-300 mb-0.5">
                ✨ Somatic Integration Summary:
              </p>
              <p className="text-xs text-purple-950 dark:text-purple-100 font-medium italic leading-relaxed text-justify">
                You've completed the full 7-step posture reset sequence. Your cervical spine is decompressed, trapezius tension is released, and effortless upright alignment has been re-established.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleReset}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Practice Again
              </button>
              <button
                onClick={() => {
                  if (onComplete) onComplete({ completed: true });
                }}
                className="flex-1 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Return to Activities
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            3. BOTTOM CONTROLS (DIAPHRAGMATIC BREATHING STYLE)
           ───────────────────────────────────────────────────────────── */}
        {!isCompleted && (
          <div className="relative z-10 space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 w-full mt-2">
            <div className="flex items-center justify-between w-full">
              {/* Reset Button */}
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>

              {/* Central Play/Pause with Status text */}
              <div className="flex flex-col items-center">
                {isPlaying ? (
                  <button
                    onClick={handlePause}
                    className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title="Pause"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={handleStartOrResume}
                    className="w-10 h-10 rounded-full bg-[#5e2be2] hover:bg-[#4f28d9] text-white flex items-center justify-center shadow-md shadow-purple-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title={countdownSeconds === 6 && currentStepIndex === 0 && !isTransitioning ? "Start" : "Resume"}
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                )}
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {isPlaying
                    ? isTransitioning
                      ? `Transition in ${gapSeconds}s`
                      : `${countdownSeconds}s remaining`
                    : countdownSeconds === 6 && currentStepIndex === 0 && !isTransitioning
                    ? 'Start'
                    : 'Resume'}
                </span>
              </div>

              {/* Balanced spacer for perfect symmetry */}
              <div className="w-[70px] hidden sm:block" />
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EDUCATIONAL DESCRIPTION CARD: What is Posture Reset?
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xl shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-8">
        {/* Section 1: Overview */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            What is Posture Reset?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal text-justify">
            Posture Reset is an evidence-based somatic practice designed to counteract the neurological and musculoskeletal effects of prolonged sitting, screen fatigue, and chronic stress. By guiding your attention through 7 targeted anatomical checkpoints, you decompress the cervical spine, release stored trapezius tension, and establish effortless upright postural stability.
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
              Follow this 7-step somatic sequence to restore kinetic alignment from cranial axis to diaphragmatic base:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">1</span>
                  Cranial Axis
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 text-[10px] font-bold">
                  6s
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Lengthen through the crown of your head to remove suboccipital compression and relieve neck strain.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">2</span>
                  Scapular & Chest Opening
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 text-[10px] font-bold">
                  12s
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Roll shoulders back and open the thoracic chest wall to expand breathing volume and reduce forward hunches.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">3</span>
                  Axial Spine & Breath
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 text-[10px] font-bold">
                  24s
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Release jaw and hand tension, align vertebrae from head to hips, and integrate with a full calming breath.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Benefits */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#5e2be2]" />
              <span>Benefits</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 text-justify">
              Clinically verified somatic and neuromuscular benefits of regular posture resetting:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Releases Musculoskeletal Tension</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Discharges accumulated tension from the upper trapezius, levator scapulae, and cervical extensors.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Activity className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Restores Neuromuscular Alignment</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Retrains motor pathways for effortless upright posture without stiff, artificial straining.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Heart className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Relieves Tension Headaches</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Eliminates forward-head slump and masseter clenching, reducing tension headaches by up to 65%.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Wind className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Boosts Vitality & Oxygenation</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Opening the ribcage enhances vital capacity, increases cerebral oxygenation, and fosters alert calm.
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
            Practicing Posture Reset 2–3 times daily establishes lasting somatic proprioception and interrupts the somatic feedback loop of stress.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-09: DBT MULTI-SENSORY COMFORT MATRIX (Self-Soothing)
   Reference: https://moodlift.hexpertify.com/games/self-soothing
   ───────────────────────────────────────────────────────────── */
function DbtMultiSensoryComfortMatrix({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [checkedSenses, setCheckedSenses] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      try {
        audioEngine.stopSpeaking();
      } catch {}
    };
  }, []);

  const senses = [
    {
      key: 'sight',
      num: 1,
      label: 'Visual Channel',
      channel: 'Sight',
      icon: Eye,
      colorClass: 'text-amber-500 bg-amber-500/10 border-amber-200 dark:border-amber-800/60',
      activeRing: 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20',
      desc: 'Warm sunlight / serene nature landscape',
      voice: 'Visual Comfort. Focus on a warm, calming visual stimulus.'
    },
    {
      key: 'sound',
      num: 2,
      label: 'Auditory Channel',
      channel: 'Sound',
      icon: Volume2,
      colorClass: 'text-sky-500 bg-sky-500/10 border-sky-200 dark:border-sky-800/60',
      activeRing: 'border-sky-400 bg-sky-50/40 dark:bg-sky-950/20',
      desc: 'Gentle ambient rain or 432Hz theta frequencies',
      voice: 'Auditory Comfort. Listen to the gentle soothing soundscape.'
    },
    {
      key: 'touch',
      num: 3,
      label: 'Tactile Somatosensory',
      channel: 'Touch',
      icon: Hand,
      colorClass: 'text-[#5e2be2] bg-[#5e2be2]/10 border-purple-200 dark:border-purple-800/60',
      activeRing: 'border-[#5e2be2] bg-purple-50/40 dark:bg-purple-950/20',
      desc: 'Soft weighted texture or cool smooth marble',
      voice: 'Tactile Sensation. Connect your physical awareness to comforting touch.'
    },
    {
      key: 'smell',
      num: 4,
      label: 'Olfactory Scent',
      channel: 'Smell',
      icon: Sparkles,
      colorClass: 'text-rose-500 bg-rose-500/10 border-rose-200 dark:border-rose-800/60',
      activeRing: 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20',
      desc: 'Calming lavender, fresh cedar, or clean air',
      voice: 'Olfactory Comfort. Inhale deeply and notice calming scents.'
    },
    {
      key: 'taste',
      num: 5,
      label: 'Gustatory Savoring',
      channel: 'Taste',
      icon: Coffee,
      colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-200 dark:border-emerald-800/60',
      activeRing: 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20',
      desc: 'Mindful sip of warm herbal tea or cool mint',
      voice: 'Gustatory Savoring. Savor a mindful taste, soothing your physiology.'
    }
  ];

  const toggleCheck = (key: string) => {
    audioEngine.playSfx('tactile_tap');
    if (checkedSenses.includes(key)) {
      setCheckedSenses(checkedSenses.filter((k) => k !== key));
    } else {
      const updated = [...checkedSenses, key];
      setCheckedSenses(updated);
      const sObj = senses.find((s) => s.key === key);
      if (sObj) {
        audioEngine.playSfx('neural_sparkle');
        if (voiceEnabled) audioEngine.speak(sObj.voice);
      }
      if (updated.length === senses.length) {
        audioEngine.playSfx('neural_sparkle');
        if (voiceEnabled) audioEngine.speak('All 5 sensory channels engaged. Click Complete Grounding to finish.');
      }
    }
  };

  const handleComplete = () => {
    if (checkedSenses.length < senses.length) return;
    setIsCompleted(true);
    audioEngine.playSfx('celebration_chords');
    if (voiceEnabled) audioEngine.speak('Multisensory comfort complete. Your somatic nervous system is regulated.');
    if (onComplete) onComplete({ completedChannels: checkedSenses });
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    try {
      audioEngine.stopSpeaking();
    } catch {}
    setCheckedSenses([]);
    setIsStarted(false);
    setIsCompleted(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 font-['Plus_Jakarta_Sans',sans-serif] text-slate-800 dark:text-slate-100 select-none">
      {/* ── CARD CONTAINER (CONSTANT HEIGHT ACROSS ALL STAGES) ── */}
      <div className="w-full min-h-[380px] sm:h-[395px] flex flex-col justify-between bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-purple-500/5 p-3.5 sm:py-4 sm:px-6 relative overflow-hidden transition-all font-['Plus_Jakarta_Sans'] select-none">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[#5e2be2]/5 dark:bg-[#5e2be2]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-teal-500/5 dark:bg-teal-500/10 blur-3xl pointer-events-none" />

        {!isStarted ? (
          /* ── PRE-START OVERVIEW SCREEN ── */
          <div className="flex-1 flex flex-col justify-between animate-fadeIn py-0.5 z-10 w-full">
            {/* Top Header Bar: Voice Toggle Only (same as other activities) */}
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

            {/* Main Intro Overview */}
            <div className="flex-1 flex flex-col justify-center items-center max-w-xl mx-auto w-full gap-5 my-auto z-10 text-center">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Engage Your 5 Senses for Rapid Calming
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Dialectical Behavior Therapy (DBT) self-soothing activates parasympathetic nervous receptors through soothing sensory stimuli.
                </p>
              </div>

              {/* 5 Senses Flow Map Preview */}
              <div className="grid grid-cols-5 gap-2 w-full max-w-lg">
                {senses.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.key}
                      className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 transition-all hover:border-[#5e2be2]/30 group"
                    >
                      <div className={`w-8 h-8 rounded-xl ${s.colorClass} border flex items-center justify-center mb-1 transition-transform group-hover:scale-105 shadow-xs`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{s.channel}</span>
                    </div>
                  );
                })}
              </div>

              {/* Start Button */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsStarted(true);
                    audioEngine.playSfx('tactile_tap');
                    if (voiceEnabled) audioEngine.speak('DBT Comfort Matrix activated. Tap each sensory channel as you engage it to soothe your nervous system.');
                  }}
                  className="px-8 py-2.5 rounded-full bg-[#5e2be2] hover:bg-[#4f28d9] text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Self-Soothing</span>
                </button>
              </div>
            </div>
          </div>
        ) : !isCompleted ? (
          /* ── ACTIVE COMFORT MATRIX STAGE ── */
          <div className="flex-1 flex flex-col justify-between animate-fadeIn py-0.5 z-10 w-full">
            {/* Top Header Bar: Voice Toggle on Right (clean & matching pre-start) */}
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

            {/* 5 Senses Interactive Matrix (Compact 2-col layout fitting inside card) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 my-auto py-1 w-full max-w-3xl mx-auto z-10">
              {senses.map((s, idx) => {
                const Icon = s.icon;
                const isChecked = checkedSenses.includes(s.key);
                const isFullWidth = idx === 4; // 5th item spans both columns
                return (
                  <div
                    key={s.key}
                    onClick={() => toggleCheck(s.key)}
                    className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isFullWidth ? 'sm:col-span-2' : ''
                    } ${
                      isChecked
                        ? `${s.activeRing} shadow-xs ring-1 ring-[#5e2be2]/30`
                        : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/60 hover:border-[#5e2be2]/40 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${s.colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          <span>{s.label}</span>
                          <span className="text-[10px] font-semibold text-slate-400">({s.channel})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{s.desc}</div>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                        isChecked
                          ? 'bg-[#5e2be2] border-[#5e2be2] text-white shadow-xs'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Controls Bar: Restart on Left, Complete on Right */}
            <div className="w-full flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 z-10 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer px-2 py-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>

              <button
                type="button"
                onClick={handleComplete}
                disabled={checkedSenses.length < senses.length}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                  checkedSenses.length === senses.length
                    ? 'bg-[#5e2be2] hover:bg-[#4f28d9] text-white shadow-md shadow-purple-500/25 cursor-pointer hover:scale-105 active:scale-95'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                <span>Complete Grounding</span>
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* ── COMPLETION SCREEN ── */
          <div className="flex-1 flex flex-col justify-center items-center text-center py-4 space-y-3.5 max-w-md mx-auto animate-fadeIn relative z-10 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#5e2be2] via-purple-600 to-indigo-600 p-1 mx-auto shadow-lg shadow-purple-500/30 flex items-center justify-center">
              <div className="w-full h-full rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-[#5e2be2]">
                <Heart className="w-8 h-8 fill-[#5e2be2]/20" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Full Multisensory Comfort Reached</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                All 5 somatic sensory channels have transmitted calming parasympathetic signals to your nervous system.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-center pt-1">
              {senses.map((s) => (
                <span
                  key={s.key}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                >
                  ✓ {s.channel}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-7 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 mt-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Practice Again</span>
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EDUCATIONAL DESCRIPTION CARD: About DBT Self-Soothing
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xl shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-8">
        {/* Section 1: Clinical Overview */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            What is DBT Multi-Sensory Self-Soothing?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal text-justify">
            Self-soothing is a core Distress Tolerance protocol within Dialectical Behavior Therapy (DBT). When experiencing emotional overwhelm, panic, or autonomic dysregulation, the brain becomes locked in sympathetic fight-or-flight overdrive. By deliberately engaging the five physical senses—vision, audition, somatosensory touch, olfaction, and gustatory savoring—you send direct, bottom-up safety cues to the brainstem and limbic circuits, gently activating the parasympathetic branch of the nervous system.
          </p>
        </div>

        {/* Section 2: Neurological Mechanism */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#5e2be2]" />
              <span>Neurological Mechanism: Bottom-Up Sensory Regulation</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 text-justify">
              How sensory gating downregulates autonomic arousal in three coordinated neural phases:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  1
                </span>
                <span className="text-xs font-black text-[#5e2be2] dark:text-purple-300 uppercase tracking-wider">
                  Thalamic Sensory Gating
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Sensory input travels directly through the thalamus, competing for neural bandwidth with hyperactive limbic threat signals and interrupting rumination loops.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  2
                </span>
                <span className="text-xs font-black text-[#5e2be2] dark:text-purple-300 uppercase tracking-wider">
                  Parasympathetic Vagal Activation
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Pleasant auditory tones and soothing tactile stimulation trigger acetylcholine release via the vagus nerve, reducing heart rate and respiratory tension.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  3
                </span>
                <span className="text-xs font-black text-[#5e2be2] dark:text-purple-300 uppercase tracking-wider">
                  Olfactory-Limbic Soothing
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Olfactory receptors connect directly to the amygdala and hippocampus without neocortical filtering, providing the fastest neurochemical route to calming panic.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Clinical Benefits */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#5e2be2]" />
              <span>Clinical Benefits</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 text-justify">
              Evidence-based therapeutic outcomes of structured multisensory engagement:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Heart className="w-5 h-5 text-[#5e2be2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Rapid Somatosensory Calming</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Quickly lowers acute distress during emotional crises or sensory overload without requiring complex cognitive reasoning.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5 text-[#5e2be2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">De-escalates Emotional Overwhelm</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Supplies the autonomic nervous system with biological confirmation of environmental comfort, de-escalating fight-or-flight triggers.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Target className="w-5 h-5 text-[#5e2be2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Grounds Attention in the Present</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Interrupts intrusive worries, anticipatory anxiety, and dissociation by directing awareness to immediate somatic sensory contact.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Compass className="w-5 h-5 text-[#5e2be2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Builds Portable Distress Tolerance</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Provides a structured sensory toolkit that can be deployed anywhere—at your desk, at home, or on the go—to foster emotional resilience.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Clinical Rule of Thumb */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-purple-500/10 border border-purple-200/80 dark:border-purple-800/60 flex items-start gap-3.5">
          <div className="w-7 h-7 rounded-full bg-[#5e2be2] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium text-justify">
            <strong>Clinical Rule of Thumb:</strong> When distress rises above a 6/10, your prefrontal cortex loses control to the limbic system. Trying to talk yourself out of panic rarely works. Instead, recruit your 5 senses to send somatic safety signals directly into the nervous system. Calming the body is the fastest way to quiet the mind.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MoodLiftSomaticPlayer;
