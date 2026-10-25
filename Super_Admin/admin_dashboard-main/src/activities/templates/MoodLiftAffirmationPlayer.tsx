import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  Heart,
  Shield,
  Feather,
  Flame,
  Plus,
  Compass,
  Check,
  Share2,
  Bookmark,
  Play,
  Pause,
  Brain,
  Activity
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';
import { audioEngine } from '../utils/therapeuticAudioEngine';

interface AffirmationCard {
  id: string;
  text: string;
  category: 'SELF-WORTH' | 'RELEASE' | 'RESILIENCE' | 'PEACE' | 'COMPASSION';
  theme: string;
  accent: string;
  reflectionPrompt: string;
}

const DEFAULT_AFFIRMATIONS: AffirmationCard[] = [
  {
    id: 'aff-1',
    text: 'I am inherently worthy, safe, and fully capable of navigating this day with calm confidence.',
    category: 'SELF-WORTH',
    theme: 'Self-Worth & Safety',
    accent: '#5e2be2',
    reflectionPrompt: 'Notice your shoulders dropping as you claim your right to occupy space.'
  },
  {
    id: 'aff-2',
    text: 'My value is not measured by relentless productivity. I am allowed to pause, rest, and restore.',
    category: 'PEACE',
    theme: 'Permission to Rest',
    accent: '#8b5cf6',
    reflectionPrompt: 'Feel the permission to simply exist without having to earn your breath.'
  },
  {
    id: 'aff-3',
    text: 'I have navigated storms before. I carry inside me the adaptive strength to handle whatever unfolds.',
    category: 'RESILIENCE',
    theme: 'Inner Strength',
    accent: '#06b6d4',
    reflectionPrompt: 'Connect with the quiet, unshakable resilience rooted deep in your spine.'
  },
  {
    id: 'aff-4',
    text: 'I release responsibility for things outside my control and fiercely protect my inner peace.',
    category: 'RELEASE',
    theme: 'Boundary Restoration',
    accent: '#ec4899',
    reflectionPrompt: 'Exhale the weight of expectations that were never yours to carry.'
  },
  {
    id: 'aff-5',
    text: 'I treat my mind and body with unconditional kindness, understanding, and radical compassion today.',
    category: 'COMPASSION',
    theme: 'Self-Compassion',
    accent: '#10b981',
    reflectionPrompt: 'Speak to yourself with the exact gentleness you would gift to someone you love.'
  }
];

const CATEGORIES = [
  { key: 'ALL', label: 'All', icon: Sparkles },
  { key: 'SELF-WORTH', label: 'Self-Worth', icon: Shield },
  { key: 'PEACE', label: 'Inner Peace', icon: Feather },
  { key: 'RESILIENCE', label: 'Resilience', icon: Flame },
  { key: 'RELEASE', label: 'Letting Go', icon: Compass },
  { key: 'COMPASSION', label: 'Compassion', icon: Heart }
];

export const MoodLiftAffirmationPlayer: React.FC<BaseActivityComponentProps> = ({
  activityName,
  onComplete
}) => {
  const [affirmations, setAffirmations] = useState<AffirmationCard[]>(DEFAULT_AFFIRMATIONS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  isPausedRef.current = isPaused;
  const pendingSentenceCompletedRef = useRef<boolean>(false);
  const [ritualStage, setRitualStage] = useState<'idle' | 'speaking' | 'absorb' | 'sealed'>('idle');
  const [absorbSeconds, setAbsorbSeconds] = useState<number>(10);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const voiceEnabledRef = useRef<boolean>(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sealedIds, setSealedIds] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Filter affirmations by category
  const filteredAffirmations = selectedCategory === 'ALL'
    ? affirmations
    : affirmations.filter((a) => a.category === selectedCategory);

  const currentAffirmation = filteredAffirmations[currentIdx] || filteredAffirmations[0] || affirmations[0];
  const isLastAffirmation = currentIdx === filteredAffirmations.length - 1;
  const isCurrentSealed = sealedIds.includes(currentAffirmation.id);

  // Camera Management
  useEffect(() => {
    if (cameraActive) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraError(null);
        })
        .catch((err) => {
          console.warn('Camera access declined:', err);
          setCameraError('Camera access not granted. Using digital mirror.');
          setCameraActive(false);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraActive]);

  // Automated practice flow: Narration speech -> 10s absorb -> Auto-advance to next
  useEffect(() => {
    if (!isStarted || isCompleted) return;

    let isCancelled = false;
    let sentenceDone = false;
    let absorbInterval: NodeJS.Timeout | null = null;
    let advanceTimer: NodeJS.Timeout | null = null;
    let fallbackSpeechTimeout: NodeJS.Timeout | null = null;

    setIsPaused(false);
    isPausedRef.current = false;
    pendingSentenceCompletedRef.current = false;

    setRitualStage('speaking');
    setAbsorbSeconds(10);

    const onSentenceCompleted = () => {
      if (isCancelled || sentenceDone) return;
      if (isPausedRef.current) {
        pendingSentenceCompletedRef.current = true;
        return;
      }
      sentenceDone = true;
      pendingSentenceCompletedRef.current = false;
      if (fallbackSpeechTimeout) clearTimeout(fallbackSpeechTimeout);
      setRitualStage('absorb');
      setAbsorbSeconds(10);

      let remaining = 10;
      absorbInterval = setInterval(() => {
        if (isPausedRef.current) return;
        remaining -= 1;
        if (isCancelled) return;
        setAbsorbSeconds(remaining);

        if (remaining <= 0) {
          if (absorbInterval) clearInterval(absorbInterval);
          setRitualStage('sealed');
          audioEngine.playSfx('neural_sparkle');
          setSealedIds((prev) =>
            prev.includes(currentAffirmation.id) ? prev : [...prev, currentAffirmation.id]
          );

          advanceTimer = setTimeout(() => {
            if (isCancelled) return;
            if (currentIdx < filteredAffirmations.length - 1) {
              setCurrentIdx((prev) => prev + 1);
            } else {
              setIsCompleted(true);
              audioEngine.playSfx('celebration_chords');
              if (voiceEnabledRef.current) {
                audioEngine.speak(
                  'Mirror ritual complete. Carry these grounding truths with you throughout your day.'
                );
              }
              if (onComplete) {
                onComplete({
                  sealedCount: filteredAffirmations.length,
                  affirmations: filteredAffirmations.map((a) => a.text)
                });
              }
            }
          }, 1200);
        }
      }, 1000);
    };

    (window as any).__onAffirmationSentenceCompleted = onSentenceCompleted;

    if (voiceEnabledRef.current) {
      audioEngine.speak(currentAffirmation.text, () => {
        onSentenceCompleted();
      });
      // Safety fallback timer if onend fails to fire in browser
      const estimatedSpeakMs = Math.max(4500, currentAffirmation.text.split(' ').length * 500 + 2000);
      fallbackSpeechTimeout = setTimeout(() => {
        onSentenceCompleted();
      }, estimatedSpeakMs);
    } else {
      // Natural reading duration when voice is muted before starting 10s absorb
      const readMs = Math.max(3500, currentAffirmation.text.split(' ').length * 300);
      fallbackSpeechTimeout = setTimeout(() => {
        onSentenceCompleted();
      }, readMs);
    }

    return () => {
      isCancelled = true;
      delete (window as any).__onAffirmationSentenceCompleted;
      if (fallbackSpeechTimeout) clearTimeout(fallbackSpeechTimeout);
      if (absorbInterval) clearInterval(absorbInterval);
      if (advanceTimer) clearTimeout(advanceTimer);
      audioEngine.stopSpeaking();
    };
  }, [currentIdx, isStarted, selectedCategory, isCompleted, filteredAffirmations.length]);

  const togglePause = () => {
    audioEngine.playSfx('tactile_tap');
    setIsPaused((prev) => {
      const next = !prev;
      isPausedRef.current = next;
      if (next) {
        audioEngine.pauseSpeaking();
      } else {
        if (ritualStage === 'speaking') {
          audioEngine.resumeSpeaking();
          if (pendingSentenceCompletedRef.current && (window as any).__onAffirmationSentenceCompleted) {
            (window as any).__onAffirmationSentenceCompleted();
          }
        }
      }
      return next;
    });
  };

  const toggleVoice = () => {
    audioEngine.playSfx('tactile_tap');
    const nextVal = !voiceEnabled;
    setVoiceEnabled(nextVal);
    voiceEnabledRef.current = nextVal;
    if (!nextVal) {
      audioEngine.stopSpeaking();
    }
  };

  const handleStart = () => {
    audioEngine.playSfx('neural_sparkle');
    setIsStarted(true);
    setIsPaused(false);
  };

  const handlePrev = () => {
    audioEngine.playSfx('tactile_tap');
    if (currentIdx > 0) {
      setIsPaused(false);
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    audioEngine.stopSpeaking();
    setIsStarted(false);
    setIsPaused(false);
    isPausedRef.current = false;
    pendingSentenceCompletedRef.current = false;
    setCurrentIdx(0);
    setRitualStage('idle');
    setAbsorbSeconds(10);
    setSealedIds([]);
    setIsCompleted(false);
  };

  const handleAddCustomAffirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    const newCard: AffirmationCard = {
      id: `custom-${Date.now()}`,
      text: customText.trim(),
      category: 'SELF-WORTH',
      theme: 'Personal Intent',
      accent: '#5e2be2',
      reflectionPrompt: 'Your chosen truth, spoken from personal agency.'
    };
    setAffirmations([newCard, ...affirmations]);
    setCustomText('');
    setShowCustomModal(false);
    setSelectedCategory('ALL');
    setCurrentIdx(0);
    audioEngine.playSfx('celebration_chords');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ─────────────────────────────────────────────────────────────
          1. CLEAN, VIEWPORT-FITTED AFFIRMATION MIRROR CARD
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-lg shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 relative overflow-hidden p-4 sm:p-5 select-none">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-[#5e2be2]/5 dark:bg-[#5e2be2]/10 blur-3xl pointer-events-none" />

        {/* Top Controls Bar: Digital Mirror & Voice On */}
        <div className="relative z-10 flex items-center justify-end mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCameraActive(!cameraActive)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                cameraActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                  : 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 border-purple-200/80 dark:border-purple-800'
              }`}
              title="Toggle Live Camera Reflection"
            >
              {cameraActive ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
              <span>{cameraActive ? 'Live Camera' : 'Digital Mirror'}</span>
            </button>

            <button
              onClick={toggleVoice}
              className="px-3 py-1 rounded-full text-[11px] font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Toggle Voice Guidance"
            >
              {voiceEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-[#5e2be2]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{voiceEnabled ? 'Voice On' : 'Muted'}</span>
            </button>
          </div>
        </div>

          {!isCompleted ? (
            <div className="space-y-3.5 relative z-10 animate-fade-in max-w-2xl mx-auto">
              {/* 🪞 HOLOGRAPHIC SHIMMER MIRROR FRAME */}
              <div className="relative w-full rounded-2xl p-1 bg-gradient-to-b from-purple-400/30 via-indigo-500/20 to-fuchsia-400/30 shadow-md shadow-purple-500/10 border border-purple-200/60 dark:border-purple-500/30">
              <div className="relative w-full min-h-[220px] sm:min-h-[240px] rounded-xl bg-gradient-to-b from-slate-900/95 via-purple-950/90 to-indigo-950/95 p-5 sm:p-7 flex flex-col justify-between items-center text-white overflow-hidden backdrop-blur-xl">
                {/* Live Camera View if Active */}
                {cameraActive && (
                  <div className="absolute inset-0 z-0 overflow-hidden rounded-xl">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform scale-x-[-1] opacity-40 mix-blend-screen"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-purple-950/60 to-slate-950/70" />
                  </div>
                )}

                {/* Shimmer Light Rays Animation */}
                <div className="absolute -top-24 -left-24 w-60 h-60 bg-radial from-purple-400/20 to-transparent blur-3xl pointer-events-none animate-pulse" />
                <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-radial from-fuchsia-400/20 to-transparent blur-3xl pointer-events-none animate-pulse" />

                {/* Top Mirror Status if Sealed */}
                {isCurrentSealed && (
                  <div className="relative z-10 flex items-center justify-end w-full">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 backdrop-blur-md">
                      <Check className="w-3 h-3" /> Sealed in Core
                    </span>
                  </div>
                )}

                {/* Affirmation Hero Text */}
                <div className="relative z-10 my-3 text-center space-y-2 max-w-xl">
                  <p className="text-lg sm:text-2xl sm:leading-snug font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-fuchsia-100 tracking-tight drop-shadow-md">
                    "{currentAffirmation.text}"
                  </p>

                  <p className="text-[11px] sm:text-xs text-purple-200/80 font-medium max-w-md mx-auto italic">
                    ✨ {currentAffirmation.reflectionPrompt}
                  </p>
                </div>

                {/* Bottom Stage Action Area */}
                <div className="relative z-10 w-full flex flex-col items-center gap-2">
                  {!isStarted ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={handleStart}
                        className="px-6 py-2 rounded-full bg-gradient-to-r from-[#5e2be2] via-purple-600 to-indigo-600 hover:from-[#5123cc] hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/30 transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.03] active:scale-[0.97]"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Start Practice</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      {ritualStage === 'speaking' && (
                        <div className="flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/40 backdrop-blur-md animate-pulse">
                          <Volume2 className="w-3.5 h-3.5 text-purple-300 animate-bounce" />
                          <span className="text-xs font-bold text-purple-100">
                            {isPaused ? 'Speech Paused' : 'Speaking affirmation...'}
                          </span>
                        </div>
                      )}

                      {ritualStage === 'absorb' && (
                        <div className="flex items-center justify-center gap-2.5 px-4 py-1.5 rounded-full bg-purple-500/25 border border-purple-400/50 backdrop-blur-md shadow-md shadow-purple-500/20">
                          <span className={`w-2 h-2 rounded-full bg-fuchsia-400 ${isPaused ? '' : 'animate-ping'}`} />
                          <span className="text-xs font-black text-purple-100">
                            {isPaused ? `Paused · ${absorbSeconds}s left` : `Breathe & Absorb: Next in ${absorbSeconds}s`}
                          </span>
                        </div>
                      )}

                      {ritualStage === 'sealed' && (
                        <div className="flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-black backdrop-blur-md animate-fade-in">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Truth anchored &bull; Moving to next...</span>
                        </div>
                      )}

                      {ritualStage !== 'sealed' && (
                        <button
                          onClick={togglePause}
                          className="px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95"
                          title={isPaused ? 'Resume Practice' : 'Pause Practice'}
                        >
                          {isPaused ? (
                            <>
                              <Play className="w-3 h-3 fill-white" />
                              <span>Resume</span>
                            </>
                          ) : (
                            <>
                              <Pause className="w-3 h-3 fill-white" />
                              <span>Pause</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stepper Dots & Navigation Controls */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handlePrev}
                disabled={currentIdx === 0}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              {/* Dot Indicators */}
              <div className="flex items-center gap-1.5">
                {filteredAffirmations.map((aff, idx) => {
                  const isCurrent = idx === currentIdx;
                  const isSealed = sealedIds.includes(aff.id);
                  return (
                    <button
                      key={aff.id}
                      onClick={() => {
                        audioEngine.playSfx('tactile_tap');
                        setCurrentIdx(idx);
                        if (!isStarted) handleStart();
                      }}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        isCurrent
                          ? 'w-6 bg-[#5e2be2]'
                          : isSealed
                          ? 'w-2 bg-emerald-500'
                          : 'w-2 bg-slate-200 dark:bg-slate-700'
                      }`}
                      title={`Go to affirmation ${idx + 1}`}
                    />
                  );
                })}
              </div>

              {/* Spacer so dots remain centered without NEXT button */}
              <div className="w-[72px]" aria-hidden="true" />
            </div>
          </div>
        ) : (
          /* Completion State & Reflection Gallery */
          <div className="max-w-md mx-auto py-4 text-center space-y-4 animate-fade-in relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-600 p-0.5 mx-auto shadow-lg shadow-purple-500/20 flex items-center justify-center">
              <div className="w-full h-full rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-[#5e2be2] dark:text-purple-400">
                <Sparkles className="w-7 h-7 animate-pulse" />
              </div>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Mirror Ritual Completed
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                You have integrated {sealedIds.length || affirmations.length} grounding affirmations into your nervous system.
              </p>
            </div>

            {/* Anchored Affirmations Deck Summary */}
            <div className="space-y-2 text-left max-w-sm mx-auto">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                📜 Anchored Self-Worth Affirmations:
              </span>
              <div className="space-y-1.5">
                {affirmations.slice(0, 3).map((aff) => (
                  <div
                    key={aff.id}
                    className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 flex items-start gap-2 shadow-xs"
                  >
                    <div className="w-4 h-4 rounded-full bg-[#5e2be2] text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#5e2be2] dark:text-purple-300">
                        {aff.theme}
                      </span>
                      <p className="text-[11px] font-medium text-slate-800 dark:text-purple-100 leading-snug line-clamp-2">
                        "{aff.text}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={handleReset}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
              >
                <RotateCcw className="w-3 h-3" /> Practice Again
              </button>

              <button
                onClick={() => {
                  if (onComplete) onComplete({ completed: true });
                }}
                className="flex-1 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-purple-500/25 transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Return to Activities
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Write Custom Affirmation Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-purple-200 dark:border-purple-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#5e2be2]" /> Write Custom Affirmation
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomAffirmation} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  What truth do you need to speak to yourself today?
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. I am proud of how hard I am trying, and I deserve peace."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#5e2be2]"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customText.trim()}
                  className="px-6 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Project into Mirror
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. EDUCATIONAL DESCRIPTION CARD: What is the Affirmation Mirror?
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xl shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Section 1: Overview */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            What is the Affirmation Mirror?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal text-justify">
            The Affirmation Mirror is an evidence-based somatic and cognitive protocol that combines mirror exposure therapy with targeted self-affirmations. By meeting your own reflection while actively vocalizing grounded truths, you engage the <strong>mirror neuron system</strong> and the <strong>medial prefrontal cortex (mPFC)</strong>. This powerful visual-auditory feedback loop interrupts negative default mode network (DMN) rumination, transforming abstract statements into deeply felt emotional safety and unshakeable self-worth.
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
              Follow this 3-phase automated ritual to rewire subconscious self-beliefs and restore nervous system calm:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">1</span>
                  Visual Reflection
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 text-[10px] font-bold">
                  PHASE 1
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Look into your digital mirror or live camera reflection. Establishing compassionate eye contact with yourself softens self-critical defense mechanisms.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">2</span>
                  Vocalized Affirmation
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 text-[10px] font-bold">
                  PHASE 2
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Hear and repeat the affirmation aloud with calm conviction. Auditory vocalization engages bilateral temporal processing and solidifies neural encoding.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">3</span>
                  Somatic Absorption
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 text-[10px] font-bold">
                  10 SECONDS
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Breathe gently for 10 seconds without rushing. Allow the truth to anchor into your nervous system as somatic tension releases from your shoulders and chest.
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
              Clinically verified neurobiological and emotional benefits of regular mirror exposure rituals:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Brain className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Activates Mirror Neuron System</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Seeing your own facial feedback while hearing affirming cues stimulates self-recognition and ventral vagal safety pathways in the brain.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Interrupts Default Mode Rumination</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Breaks chronic thought loops of imposter syndrome, harsh self-criticism, and catastrophic worry by anchoring attention in real-time facts.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Heart className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Strengthens Parasympathetic Calm</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  The built-in 10-second absorption window encourages full exhalations, reducing sympathetic arousal, heart rate, and baseline cortisol.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Activity className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Solidifies Neuroplastic Core Beliefs</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Repeated mirror affirmations strengthen synaptic density in self-compassion networks, fostering resilient self-worth that persists under stress.
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
            Practicing the Affirmation Mirror for 2–3 minutes each morning anchors your nervous system before external demands arise, establishing a compassionate, grounded mental baseline for your entire day.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MoodLiftAffirmationPlayer;
