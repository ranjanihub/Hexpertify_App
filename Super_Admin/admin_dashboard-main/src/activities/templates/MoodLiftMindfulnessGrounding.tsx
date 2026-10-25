import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Eye,
  Hand,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Heart,
  Zap,
  Tag,
  Compass,
  Radio,
  Target,
  Play,
  Pause,
  Droplets,
  Shield,
  Layers,
  Footprints,
  TrendingDown,
  Smile,
  ShieldCheck,
  Wind,
  Coffee,
  Check,
  Activity,
  Info,
  Clock,
  Plus,
  Sliders,
  AlertCircle,
  Copy,
  BookOpen,
  Award,
  HelpCircle
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';
import { audioEngine } from '../utils/therapeuticAudioEngine';
import { CognitiveGrounding54321 } from './CognitiveGrounding54321';

interface MindfulnessActivityProps extends BaseActivityComponentProps {
  activityId?: string;
}

export const MoodLiftMindfulnessGrounding: React.FC<MindfulnessActivityProps> = ({
  activityId = 'ACT-05',
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

  if (activityId === 'ACT-05') {
    return <SensoryRoomScanner activityName={activityName} onComplete={onComplete} />;
  } else if (activityId === 'ACT-06') {
    return <EmotionalResonanceCompass activityName={activityName} onComplete={onComplete} />;
  } else if (activityId === 'ACT-07') {
    return <BioRadarPhysicalGrounding activityName={activityName} onComplete={onComplete} />;
  } else {
    return <CognitiveGrounding54321 activityName={activityName} onComplete={onComplete} />;
  }
};

/* ─────────────────────────────────────────────────────────────
   ACT-05: SENSORY ROOM SCANNER (Objective Environmental Grounding)
   ───────────────────────────────────────────────────────────── */
const ROOM_OBJECT_SUGGESTIONS = [
  'Laptop / Screen',
  'Coffee / Tea Mug',
  'Indoor Plant',
  'Notebook / Book',
  'Water Bottle',
  'Chair / Cushion'
];

const COLOR_SUGGESTIONS = ['Matte Black', 'Warm Amber', 'Leaf Green', 'Clean White', 'Earthy Wood', 'Cool Blue'];
const TEXTURE_LIGHT_SUGGESTIONS = ['Smooth & Warm', 'Grainy Wood', 'Soft Fabric', 'Cool Glass', 'Soft Sunlight', 'In Shadow'];

function SensoryRoomScanner({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [item, setItem] = useState({
    name: '',
    color: '',
    texture: ''
  });
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Ensure speech stops on unmount
  useEffect(() => {
    return () => {
      try {
        audioEngine.stopSpeaking();
      } catch {}
    };
  }, []);

  const isStep1Valid = item.name.trim().length > 0;
  const isStep2Valid = item.color.trim().length > 0;
  const isStep3Valid = item.texture.trim().length > 0;

  const handleNext = () => {
    audioEngine.playSfx('sonar_ping');
    if (step === 1) {
      if (!isStep1Valid) return;
      setStep(2);
      if (voiceEnabled) audioEngine.speak(`Step 2: Color. Look closely at your ${item.name}. What color tone or shade do you observe?`);
    } else if (step === 2) {
      if (!isStep2Valid) return;
      setStep(3);
      if (voiceEnabled) audioEngine.speak(`Step 3: Texture. Notice how the surface feels or how light reflects off your ${item.name}.`);
    } else if (step === 3) {
      if (!isStep3Valid) return;
      setIsCompleted(true);
      audioEngine.playSfx('celebration_chords');
      if (voiceEnabled) audioEngine.speak('Environmental scan complete. You are fully present and grounded in this room.');
      if (onComplete) onComplete({ item });
    }
  };

  const handleComplete = () => {
    if (!item.name.trim()) return;
    setIsCompleted(true);
    audioEngine.playSfx('celebration_chords');
    if (voiceEnabled) audioEngine.speak('Environmental scan complete. You are fully present and grounded in this room.');
    if (onComplete) onComplete({ item });
  };

  const handleBack = () => {
    audioEngine.playSfx('tactile_tap');
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3);
    }
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    try {
      audioEngine.stopSpeaking();
    } catch {}
    setStep(1);
    setItem({ name: '', color: '', texture: '' });
    setIsStarted(false);
    setIsCompleted(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 font-['Plus_Jakarta_Sans',sans-serif] text-slate-800 dark:text-slate-100 select-none">
      {/* ── CARD CONTAINER (CONSTANT HEIGHT ACROSS ALL STEPS) ── */}
      <div className="w-full min-h-[380px] sm:h-[395px] flex flex-col justify-between bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-purple-500/5 p-3.5 sm:py-4 sm:px-6 relative overflow-hidden transition-all font-['Plus_Jakarta_Sans'] select-none">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[#5e2be2]/5 dark:bg-[#5e2be2]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-teal-500/5 dark:bg-teal-500/10 blur-3xl pointer-events-none" />

        {!isStarted ? (
          /* ── PRE-START OVERVIEW SCREEN ── */
          <div className="flex-1 flex flex-col justify-between animate-fadeIn py-0.5 z-10 w-full">
            {/* Top Header Bar: Voice Toggle Only (same as other activity) */}
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
                  Orient Your Senses to the Present Room
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Ground your awareness in your immediate physical space by identifying and observing 3 real objects.
                </p>
              </div>

              {/* 3 Target Flow Map Preview */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                {[
                  {
                    num: 1,
                    label: 'OBJECT',
                    desc: 'Pick an anchor',
                    icon: Target,
                    color: 'text-[#5e2be2]',
                    badgeBg: 'bg-purple-500/10 text-[#5e2be2] border-purple-200/80 dark:border-purple-800/80'
                  },
                  {
                    num: 2,
                    label: 'COLOR',
                    desc: 'Notice tone & shade',
                    icon: Eye,
                    color: 'text-indigo-600 dark:text-indigo-400',
                    badgeBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-200/80 dark:border-indigo-800/80'
                  },
                  {
                    num: 3,
                    label: 'TEXTURE',
                    desc: 'Light & surfaces',
                    icon: Compass,
                    color: 'text-teal-600 dark:text-teal-400',
                    badgeBg: 'bg-teal-500/10 text-teal-600 border-teal-200/80 dark:border-teal-800/80'
                  }
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={t.num}
                      className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 transition-all hover:border-[#5e2be2]/30 group"
                    >
                      <div className={`w-9 h-9 rounded-xl ${t.badgeBg} border flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105 shadow-xs`}>
                        <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${t.color}`} />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">{t.num}</span>
                        <span className="text-[10px] sm:text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{t.label}</span>
                      </div>
                      <span className="text-[10px] sm:text-[10.5px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t.desc}</span>
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
                    if (voiceEnabled) audioEngine.speak('Step 1: Object. Look around your space and choose an anchor object to focus on.');
                  }}
                  className="px-8 py-2.5 rounded-full bg-[#5e2be2] hover:bg-[#4f28d9] text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start</span>
                </button>
              </div>
            </div>
          </div>
        ) : !isCompleted ? (
          /* ── ACTIVE SCANNING STAGE (SEPARATED INTO STEP 1, STEP 2, AND STEP 3) ── */
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
            </div>

            {/* Form Content */}
            <div className="flex-1 flex flex-col justify-between w-full max-w-2xl sm:max-w-3xl mx-auto py-1 z-10">
              {step === 1 ? (
                /* ── STEP 1: OBJECT SELECTION & DIRECT TYPING ── */
                <div className="p-3.5 sm:p-4 bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3 shadow-xs my-auto">
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 tracking-tight">
                      <Target className="w-4 h-4 text-[#5e2be2]" />
                      <span>Look around your room and pick an anchor object:</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select one of the suggested items or type any object you see in your physical space.
                    </p>
                  </div>

                  {/* 6 Clean Text Chips (No Emojis) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ROOM_OBJECT_SUGGESTIONS.map((label) => {
                      const isSelected = item.name === label;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            audioEngine.playSfx('tactile_tap');
                            setItem({ ...item, name: label });
                          }}
                          className={`px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between text-left cursor-pointer border ${
                            isSelected
                              ? 'bg-purple-100/90 dark:bg-purple-950/80 border-[#5e2be2] text-[#5e2be2] dark:text-purple-300 font-bold shadow-xs ring-1 ring-[#5e2be2]/30 scale-[1.01]'
                              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-700 font-medium'
                          }`}
                        >
                          <span className="truncate text-xs font-semibold">{label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#5e2be2] shrink-0 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Direct Typing Option */}
                  <div className="relative pt-0.5">
                    <input
                      type="text"
                      placeholder="Or type another object in your physical space..."
                      value={item.name}
                      onChange={(e) => setItem({ ...item, name: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#5e2be2] focus:ring-1 focus:ring-[#5e2be2]/30 font-medium shadow-2xs"
                    />
                  </div>
                </div>
              ) : step === 2 ? (
                /* ── STEP 2: COLOR SELECTION & DIRECT TYPING ── */
                <div className="p-3.5 sm:p-4 bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3 shadow-xs my-auto">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800/60 text-[#5e2be2] dark:text-purple-300 text-[11px] font-semibold">
                      <span>Anchor Object:</span>
                      <span className="font-bold underline">{item.name || 'Selected Object'}</span>
                    </div>
                    <label className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 tracking-tight pt-0.5">
                      <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Notice its specific color tone and shade:</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Observe how the color appears under the current lighting of your room.
                    </p>
                  </div>

                  {/* 6 Color Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COLOR_SUGGESTIONS.map((col) => {
                      const isSelected = item.color === col;
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            audioEngine.playSfx('tactile_tap');
                            setItem({ ...item, color: col });
                          }}
                          className={`px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between text-left cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-100/90 dark:bg-indigo-950/80 border-indigo-600 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs ring-1 ring-indigo-500/30 scale-[1.01]'
                              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 font-medium'
                          }`}
                        >
                          <span className="truncate text-xs font-semibold">{col}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Direct Typing Option for Color */}
                  <div className="relative pt-0.5">
                    <input
                      type="text"
                      placeholder="Or type a specific color or tone (e.g. Deep Navy, Muted Grey)..."
                      value={item.color}
                      onChange={(e) => setItem({ ...item, color: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#5e2be2] focus:ring-1 focus:ring-[#5e2be2]/30 font-medium shadow-2xs"
                    />
                  </div>
                </div>
              ) : (
                /* ── STEP 3: TEXTURE & LIGHT SELECTION ── */
                <div className="p-3.5 sm:p-4 bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3 shadow-xs my-auto">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800/60 text-[#5e2be2] dark:text-purple-300 text-[11px] font-semibold">
                      <span>Anchor Object:</span>
                      <span className="font-bold underline">{item.name || 'Selected Object'}</span>
                    </div>
                    <label className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 tracking-tight pt-0.5">
                      <Compass className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>Notice surface texture and how light falls on it:</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Observe if the surface is smooth, wood-grained, fabric, or in soft light/shadow.
                    </p>
                  </div>

                  {/* 6 Texture Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TEXTURE_LIGHT_SUGGESTIONS.map((tex) => {
                      const isSelected = item.texture === tex;
                      return (
                        <button
                          key={tex}
                          type="button"
                          onClick={() => {
                            audioEngine.playSfx('tactile_tap');
                            setItem({ ...item, texture: tex });
                          }}
                          className={`px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between text-left cursor-pointer border ${
                            isSelected
                              ? 'bg-teal-100/90 dark:bg-teal-950/80 border-teal-600 text-teal-600 dark:text-teal-300 font-bold shadow-xs ring-1 ring-teal-500/30 scale-[1.01]'
                              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-teal-300 dark:hover:border-teal-700 font-medium'
                          }`}
                        >
                          <span className="truncate text-xs font-semibold">{tex}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Direct Typing Option for Texture */}
                  <div className="relative pt-0.5">
                    <input
                      type="text"
                      placeholder="Or type surface or lighting details (e.g. Polished ceramic, sun-warmed glass)..."
                      value={item.texture}
                      onChange={(e) => setItem({ ...item, texture: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#5e2be2] focus:ring-1 focus:ring-[#5e2be2]/30 font-medium shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* Navigation Footer: Restart/Back on left, Next/Complete on right */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                {step === 1 ? (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restart</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                )}

                {step === 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!isStep1Valid}
                    className={`px-7 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                      isStep1Valid
                        ? 'bg-[#5e2be2] hover:bg-[#4f28d9] text-white shadow-md shadow-purple-500/25 cursor-pointer hover:scale-105 active:scale-95'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span>Next: Notice Color</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : step === 2 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!isStep2Valid}
                    className={`px-7 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                      isStep2Valid
                        ? 'bg-[#5e2be2] hover:bg-[#4f28d9] text-white shadow-md shadow-purple-500/25 cursor-pointer hover:scale-105 active:scale-95'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span>Next: Notice Texture</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!isStep3Valid}
                    className={`px-7 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                      isStep3Valid
                        ? 'bg-[#5e2be2] hover:bg-[#4f28d9] text-white shadow-md shadow-purple-500/25 cursor-pointer hover:scale-105 active:scale-95'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span>Complete Grounding</span>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── COMPLETION SCREEN ── */
          <div className="flex-1 flex flex-col justify-center items-center text-center py-4 space-y-3.5 max-w-md mx-auto animate-fadeIn relative z-10 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#5e2be2] via-purple-600 to-indigo-600 p-1 mx-auto shadow-lg shadow-purple-500/30 flex items-center justify-center">
              <div className="w-full h-full rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-[#5e2be2]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Anchored in Physical Space</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                You have successfully grounded your sensory attention to <span className="font-bold text-[#5e2be2]">{item.name}</span>.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center pt-1">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                1. Object: {item.name}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                2. Color: {item.color}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                3. Texture: {item.texture}
              </span>
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
          2. EDUCATIONAL DESCRIPTION CARD: What is Describe Your Room?
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xl shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Section 1: Overview */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            What is Environmental Sensory Scanning?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal text-justify">
            Environmental Sensory Scanning (Describe Your Room) is an evidence-based somatic grounding protocol designed to rapidly interrupt acute anxiety, panic escalation, and dissociative detachment. When your nervous system registers psychological distress, cognitive attention narrows inward onto perceived threats and catastrophizing thoughts. By deliberately requiring your visual and tactile cortices to identify concrete objects in your physical room and describe their exact color, texture, and light reflection, neural bandwidth is forcibly redirected away from the amygdala. This concrete sensory observation proves to your autonomic nervous system that you are physically safe in the present space.
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
              This 3-phase visual scanning exercise anchors attention outward into physical reality:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  1
                </span>
                <span className="text-xs font-black text-[#5e2be2] dark:text-purple-300 uppercase tracking-wider">
                  Target Isolation
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Selecting an everyday physical object in your immediate field of vision halts internal rumination and establishes a concrete anchor in the external environment.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  2
                </span>
                <span className="text-xs font-black text-[#5e2be2] dark:text-purple-300 uppercase tracking-wider">
                  Granular Sensory Mapping
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Detailing specific color shades, physical textures, and light reflections recruits high-order processing in the parietal and occipital lobes, overriding threat circuits.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  3
                </span>
                <span className="text-xs font-black text-[#5e2be2] dark:text-purple-300 uppercase tracking-wider">
                  Neuro-Somatic Safety
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Completing 3 full environmental targets sends reassuring feedback loops to the autonomic nervous system, downregulating fight-or-flight and restoring mental clarity.
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
              Regular environmental scanning builds automatic grounding reflexes when feeling overwhelmed:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Brain className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Interrupts Panic & Dissociation</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Quickly pulls awareness out of intrusive thought spirals by shifting neuro-metabolic energy from the limbic system to sensory observation.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Target className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Anchors to Objective Reality</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Provides undeniable sensory evidence that your immediate surroundings are secure, helping distinguish perceived threats from physical reality.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Lowers Somatic Arousal</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Engaging slow, focused visual attention reduces rapid breathing, muscle clenching, and sympathetic heart rate elevations.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Compass className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Restores Mindfulness in Any Setting</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  A subtle, portable grounding technique that can be performed anywhere — at a work desk, in transit, or at home — without special equipment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Rule of Thumb */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-teal-500/10 border border-indigo-200/80 dark:border-indigo-800/80 flex items-start gap-3.5 shadow-xs">
          <div className="w-7 h-7 rounded-full bg-[#5e2be2] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium text-justify">
            <strong>Clinical Rule of Thumb:</strong> When anxiety, depersonalization, or racing thoughts start to detach you from your body, stop analyzing your thoughts. Instead, orient your vision outward onto 3 concrete physical objects. Anchoring to objective reality stabilizes your physiology faster than mental reasoning.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-06: NAME THE MOMENT (Mindful Emotional Check-In & Awareness)
   Reference: https://moodlift.hexpertify.com/games/name-the-moment
   ───────────────────────────────────────────────────────────── */
const CORE_EMOTIONS = [
  { name: 'Calm', emoji: '🌿', desc: 'Peaceful & Centered' },
  { name: 'Sad', emoji: '💙', desc: 'Heavy or Grieving' },
  { name: 'Stressed', emoji: '⚡', desc: 'Under Pressure' },
  { name: 'Angry', emoji: '🔥', desc: 'Boundary Alert' },
  { name: 'Overwhelmed', emoji: '🌊', desc: 'Carrying Too Much' },
  { name: 'Lonely', emoji: '🕊️', desc: 'Craving Connection' },
  { name: 'Grateful', emoji: '💖', desc: 'Present & Appreciative' },
  { name: 'Proud', emoji: '🌟', desc: 'Self-Respect & Dignity' },
  { name: 'Confused', emoji: '🌀', desc: 'Seeking Clarity' },
  { name: 'Hopeful', emoji: '✨', desc: 'Looking Forward' },
  { name: 'Tired', emoji: '🌙', desc: 'Needing Deep Rest' },
  { name: 'Numb', emoji: '☁️', desc: 'Protected & Sheltered' }
];

const EMOTION_VALIDATIONS: Record<string, string> = {
  calm: "It's okay to feel good. Breathe in that peace.",
  sad: "Sadness is a sign of caring. Your feelings are valid.",
  stressed: "Stress doesn't mean you're failing — it means you're carrying too much alone.",
  angry: "Anger is often a boundary, not a flaw.",
  overwhelmed: "It's okay to feel overwhelmed. You don't have to handle everything alone.",
  lonely: "Loneliness is a signal that you need connection. You deserve to be seen.",
  grateful: "Gratitude is a sign of presence and awareness. You're noticing what matters.",
  proud: "Pride in yourself is not arrogance — it's self-respect.",
  confused: "Confusion means you're learning. It's okay not to have all the answers.",
  hopeful: "Hope is a powerful force. Hold onto it gently.",
  tired: "Rest is not laziness — it's essential. You deserve care.",
  numb: "Numbness is a sign your mind and body are protecting you. That's okay."
};

const getIntensityMeta = (intensity: number) => {
  if (intensity <= 2) return { emoji: '🌱', label: 'Mild' };
  if (intensity <= 4) return { emoji: '🌿', label: 'Gentle' };
  if (intensity <= 6) return { emoji: '💭', label: 'Moderate' };
  if (intensity <= 8) return { emoji: '⚡', label: 'Strong' };
  return { emoji: '🔥', label: 'Intense' };
};

function EmotionalResonanceCompass({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [phase, setPhase] = useState<'start' | 'breathe' | 'emotion' | 'intensity' | 'reflection' | 'complete'>('start');
  const [countdown, setCountdown] = useState<number>(5);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const [customEmotion, setCustomEmotion] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [intensity, setIntensity] = useState<number>(5);
  const [reflectionText, setReflectionText] = useState<string>('');
  const [voiceCoach, setVoiceCoach] = useState<boolean>(true);
  const voiceCoachRef = useRef(voiceCoach);
  voiceCoachRef.current = voiceCoach;

  const handleToggleVoice = () => {
    const next = !voiceCoach;
    setVoiceCoach(next);
    voiceCoachRef.current = next;
    audioEngine.setVoiceEnabled(next);
    if (!next) {
      audioEngine.stopSpeaking();
    }
  };

  const activeEmotionName = isCustomMode ? customEmotion : selectedEmotion;

  // Countdown timer for 5s gentle breath
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === 'breathe' && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (phase === 'breathe' && countdown === 0) {
      audioEngine.playSfx('singing_bowl');
      if (voiceCoachRef.current) {
        audioEngine.speak('Breath centered. What emotion are you noticing right now?');
      }
      setPhase('emotion');
    }
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  const handleStart = () => {
    audioEngine.playSfx('tactile_tap');
    if (voiceCoachRef.current) {
      audioEngine.speak('Take a slow, gentle breath. Settle into the present moment.');
    }
    setCountdown(5);
    setPhase('breathe');
  };

  const handleSelectEmotion = (emotionName: string) => {
    audioEngine.playSfx('neural_sparkle');
    setSelectedEmotion(emotionName);
    setIsCustomMode(false);
    if (voiceCoachRef.current) {
      audioEngine.speak(`Noticing ${emotionName}.`);
    }
  };

  const handleCustomEmotionChange = (val: string) => {
    setCustomEmotion(val);
    setIsCustomMode(true);
    setSelectedEmotion('');
  };

  const handleProceedToIntensity = () => {
    if (!activeEmotionName.trim()) return;
    audioEngine.playSfx('tactile_tap');
    if (voiceCoachRef.current) {
      audioEngine.speak('How strong is this feeling on a scale of 1 to 10?');
    }
    setPhase('intensity');
  };

  const handleProceedToReflection = () => {
    audioEngine.playSfx('tactile_tap');
    if (voiceCoachRef.current) {
      audioEngine.speak('If this feeling had a voice, what would it say?');
    }
    setPhase('reflection');
  };

  const handleFinish = () => {
    audioEngine.playSfx('celebration_chords');
    if (voiceCoachRef.current) {
      audioEngine.speak('You did something meaningful. You named and honored your experience.');
    }
    setPhase('complete');
    if (onComplete) {
      const validation =
        EMOTION_VALIDATIONS[activeEmotionName.toLowerCase()] ||
        "Whatever you feel is allowed. There's no right or wrong emotion.";
      onComplete({
        emotion: activeEmotionName,
        intensity,
        intensityLabel: getIntensityMeta(intensity).label,
        reflection: reflectionText,
        validation
      });
    }
  };

  // Unmount cleanup to stop voice
  useEffect(() => {
    return () => {
      audioEngine.stopSpeaking();
    };
  }, []);

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    audioEngine.stopSpeaking();
    setPhase('start');
    setCountdown(5);
    setSelectedEmotion('');
    setCustomEmotion('');
    setIsCustomMode(false);
    setIntensity(5);
    setReflectionText('');
  };

  const currentValidation =
    EMOTION_VALIDATIONS[activeEmotionName.toLowerCase()] ||
    "Whatever you feel is allowed. There's no right or wrong emotion. Giving it space is the first step to peace.";

  const intensityMeta = getIntensityMeta(intensity);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. MAIN INTERACTIVE EMOTIONAL CHECK-IN STAGE
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
            {voiceCoach ? <Volume2 className="w-3.5 h-3.5 text-[#5e2be2]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span>{voiceCoach ? 'Voice On' : 'Muted'}</span>
          </button>
        </div>

        {/* PHASE 1: START */}
        {phase === 'start' && (
          <div className="max-w-lg mx-auto text-center space-y-3 py-3 sm:py-4 my-auto animate-fade-in z-10">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Take a slow breath. Let's gently check in with how you're feeling right now in this present moment.
            </p>

            <div className="bg-purple-50/70 dark:bg-purple-950/40 border-l-4 border-[#5e2be2] p-2.5 sm:p-3 rounded-xl text-center max-w-sm mx-auto">
              <p className="text-xs text-purple-950 dark:text-purple-200 italic leading-relaxed font-medium">
                "Whatever you feel is allowed. There is no right or wrong emotion."
              </p>
            </div>

            <div className="pt-1">
              <button
                onClick={handleStart}
                className="px-6 py-2 rounded-full bg-[#5e2be2] hover:bg-[#4f28d9] text-white text-xs font-bold shadow-md shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                Start
              </button>
            </div>
          </div>
        )}

        {/* PHASE 2: PAUSE & BREATHE */}
        {phase === 'breathe' && (
          <div className="max-w-md mx-auto text-center space-y-3 py-2 my-auto animate-fade-in z-10">
            <div className="space-y-0.5">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Just notice your breath
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                No need to control it. Simply observe the natural rhythm.
              </p>
            </div>

            {/* Glowing Pulsing Breathing Orb with Countdown */}
            <div className="flex justify-center py-2">
              <div className="relative flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-[#5e2be2]/10 dark:bg-[#5e2be2]/20 animate-ping duration-[3000ms] absolute" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-100 via-indigo-50 to-purple-50 dark:from-purple-900/40 dark:via-indigo-950/40 dark:to-purple-950/40 border-2 border-[#5e2be2]/30 shadow-lg shadow-purple-500/20 flex flex-col items-center justify-center relative animate-pulse duration-[2000ms]">
                  <span className="text-2xl font-black text-[#5e2be2] dark:text-purple-300">
                    {countdown}
                  </span>
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    Breathe
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Take your time. There's no rush.
            </p>

            <div>
              <button
                onClick={() => {
                  setCountdown(0);
                  setPhase('emotion');
                }}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold underline underline-offset-4 cursor-pointer"
              >
                Skip breath to emotions →
              </button>
            </div>
          </div>
        )}

        {/* PHASE 3: IDENTIFY EMOTION */}
        {phase === 'emotion' && (
          <div className="max-w-2xl mx-auto space-y-2.5 py-1 animate-fade-in z-10 w-full">
            <div className="text-center space-y-0.5">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                What are you feeling?
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose or type the emotion that feels closest — even if uncertain.
              </p>
            </div>

            {/* 12 Emotion Grid - Compact */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
              {CORE_EMOTIONS.map((e) => {
                const isSelected = selectedEmotion === e.name && !isCustomMode;
                return (
                  <button
                    key={e.name}
                    onClick={() => handleSelectEmotion(e.name)}
                    className={`px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/70 border-[#5e2be2] text-[#5e2be2] dark:text-purple-300 shadow-xs ring-1 ring-[#5e2be2]/40 scale-[1.01]'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-purple-50/50 dark:hover:bg-slate-800 hover:border-purple-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sm shrink-0">{e.emoji}</span>
                      <span className="font-bold text-xs truncate text-slate-900 dark:text-white">{e.name}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#5e2be2] dark:text-purple-300" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Input */}
            <div className="pt-1">
              <input
                type="text"
                value={customEmotion}
                onChange={(e) => handleCustomEmotionChange(e.target.value)}
                placeholder="Or type what you're feeling in your own words..."
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#5e2be2] focus:ring-1 focus:ring-[#5e2be2]/20 font-medium shadow-2xs"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                onClick={handleProceedToIntensity}
                disabled={!activeEmotionName.trim()}
                className="px-5 py-1.5 bg-[#5e2be2] hover:bg-[#4f28d9] disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs rounded-full shadow-md shadow-purple-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                Continue to Intensity →
              </button>
            </div>
          </div>
        )}

        {/* PHASE 4: RATE INTENSITY */}
        {phase === 'intensity' && (
          <div className="max-w-lg mx-auto space-y-3 py-2 animate-fade-in z-10 w-full">
            <div className="text-center space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-block">
                Acknowledged: {activeEmotionName}
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                How strong is this feeling?
              </h3>
            </div>

            {/* Slider & Tier Display */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                <span className="text-[11px]">🌱 Mild (1)</span>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-base">{intensityMeta.emoji}</span>
                  <span className="text-xs font-extrabold text-[#5e2be2] dark:text-purple-300">{intensityMeta.label}</span>
                </div>
                <span className="text-[11px]">🔥 Intense (10)</span>
              </div>

              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#5e2be2]"
              />

              <div className="text-center">
                <span className="text-3xl font-black text-[#5e2be2] dark:text-purple-300">
                  {intensity}
                </span>
                <span className="text-xs font-bold text-slate-400 ml-1">/ 10</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setPhase('emotion')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={handleProceedToReflection}
                className="px-5 py-1.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-full shadow-md shadow-purple-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                Continue to Reflection →
              </button>
            </div>
          </div>
        )}

        {/* PHASE 5: REFLECTION */}
        {phase === 'reflection' && (
          <div className="max-w-lg mx-auto space-y-3 py-2 animate-fade-in z-10 w-full">
            <div className="text-center space-y-0.5">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Reflect & Listen Inward
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                If this feeling had a voice, what would it say?
              </p>
            </div>

            {/* Inspiration Chips */}
            <div className="bg-purple-50/70 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-200/80 dark:border-purple-800/60 space-y-1">
              <div className="text-[10px] font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                ✨ Tap an inspiration phrase:
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  'I need rest.',
                  'I feel unseen right now.',
                  "I'm proud of myself for trying.",
                  'I need a moment to breathe.'
                ].map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => setReflectionText(phrase)}
                    className="px-2 py-0.5 rounded-md text-[10.5px] bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-purple-950 dark:text-purple-200 hover:bg-purple-100/60 font-medium transition-all cursor-pointer shadow-2xs"
                  >
                    "{phrase}"
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              rows={2}
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="What does your feeling want to tell you?"
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#5e2be2] focus:ring-1 focus:ring-[#5e2be2]/20 font-medium shadow-2xs resize-none"
            />

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleFinish}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Skip
              </button>
              <button
                onClick={handleFinish}
                className="px-5 py-1.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-full shadow-md shadow-purple-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                Complete Check-In →
              </button>
            </div>
          </div>
        )}

        {/* PHASE 6: COMPASSIONATE VALIDATION & COMPLETION */}
        {phase === 'complete' && (
          <div className="max-w-lg mx-auto text-center space-y-3 py-3 my-auto animate-fade-in z-10 w-full">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 p-1 mx-auto flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#5e2be2] flex items-center justify-center text-white shadow-md shadow-purple-500/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {activeEmotionName}
              </h3>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#5e2be2] dark:text-purple-300 mt-0.5">
                Emotional State Witnessed & Honored
              </p>
            </div>

            {/* Summary Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-left space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-500 dark:text-slate-400">Intensity Level:</span>
                <span className="text-[#5e2be2] dark:text-purple-300 font-extrabold flex items-center gap-1.5">
                  {intensity}/10 {intensityMeta.emoji} ({intensityMeta.label})
                </span>
              </div>
              {reflectionText && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 space-y-0.5">
                  <span className="font-bold text-slate-500 dark:text-slate-400 block">Inner Voice Reflection:</span>
                  <p className="text-slate-800 dark:text-slate-200 italic font-medium">"{reflectionText}"</p>
                </div>
              )}
            </div>

            {/* Compassionate Clinical Validation Message */}
            <div className="bg-purple-50 dark:bg-purple-950/50 border-l-4 border-[#5e2be2] p-3 rounded-xl text-left shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5e2be2] dark:text-purple-300 mb-0.5">
                ✨ Compassionate Validation:
              </p>
              <p className="text-xs text-purple-950 dark:text-purple-100 font-medium italic leading-relaxed">
                "{currentValidation}"
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleReset}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Another Check-In
              </button>
              <button
                onClick={() => {
                  if (onComplete) onComplete();
                }}
                className="flex-1 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Return to Activities
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EDUCATIONAL DESCRIPTION CARD: What is Name the Moment?
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xl shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Section 1: Overview */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            What is Name the Moment?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal text-justify">
            Name the Moment is a compassionate emotional check-in practice that helps you recognize and label your current emotional state in a gentle, mindful, and non-judgmental way. Rather than trying to fix or suppress your feelings, this practice creates space to observe emotions with curiosity and acceptance, activating prefrontal regulation over reactive neural circuits.
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
              Follow this 3-step mindful check-in to identify and validate your internal emotional landscape.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Step 1: Pause & Breathe */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">1</span>
                  Pause & Breathe
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 text-[10px] font-bold">
                  STEP 1
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Take a slow breath and step back from daily busyness. Simply notice how your body and mind feel without judgment.
              </p>
            </div>

            {/* Step 2: Name the Emotion */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">2</span>
                  Name the Emotion
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 text-[10px] font-bold">
                  STEP 2
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Identify and label the feeling that resonates most accurately. Naming the feeling reduces limbic intensity immediately.
              </p>
            </div>

            {/* Step 3: Validate & Reflect */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">3</span>
                  Validate & Reflect
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 text-[10px] font-bold">
                  STEP 3
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Acknowledge the somatic intensity and receive gentle clinical validation. All feelings are natural human experiences.
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
              Regular emotional naming practice provides substantial psychological and physiological benefits:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Brain className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Increases Emotional Awareness</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Develops fine-grained emotional granularity, helping you understand subtle triggers before they escalate.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Reduces Emotional Overwhelm</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Affect labeling reduces amygdala hyperactivation, lowering somatic distress and mental spiraling.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Smile className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cultivates Self-Compassion</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Replaces self-criticism with supportive acceptance, creating a healthier relationship with your inner world.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enhances Psychological Resilience</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Builds capacity to sit with uncomfortable emotions without reactive suppression or avoidance behaviors.
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
            By naming what you feel regularly, you build deep emotional clarity, calm your nervous system, and develop unconditional self-compassion in just a few mindful minutes.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-07: PHYSICAL GROUNDING (Somatic & CBT Body-Based Anchoring)
   Reference: https://moodlift.hexpertify.com/games/physical-grounding
   ───────────────────────────────────────────────────────────── */
const GROUNDING_STEPS = [
  {
    title: 'Splash Cold Water',
    tag: 'NERVOUS SYSTEM RESET',
    instruction: 'If available, run cold water on your wrists or splash your face. Feel the shock awaken your senses and interrupt stress spirals.',
    duration: 15,
    icon: Droplets,
    badgeColor: '#06b6d4',
    tip: 'Cold temperature stimulates the vagus nerve and triggers the parasympathetic calming reflex.'
  },
  {
    title: 'Touch Textured Objects',
    tag: 'TACTILE SENSORY ANCHOR',
    instruction: 'Hold something with a distinct texture: sandpaper, rough fabric, tree bark, ice cubes, or velvet. Feel the sensation fully as your fingers explore.',
    duration: 20,
    icon: Hand,
    badgeColor: '#8b5cf6',
    tip: 'Direct physical tactile input redirects cortical attention away from anxious mental loops.'
  },
  {
    title: 'Apply Chest Pressure',
    tag: 'VAGAL REGULATION',
    instruction: 'Place your hand on your chest and apply gentle, comforting pressure. Feel your heartbeat beneath your fingers. You are alive, you are safe, you are here.',
    duration: 20,
    icon: Heart,
    badgeColor: '#ec4899',
    tip: 'Gentle pressure on the sternum activates proprioception and downregulates autonomic heart rate.'
  },
  {
    title: 'Engage Your Muscles',
    tag: 'SOMATIC TENSION RELEASE',
    instruction: 'Tense and release different muscle groups: make tight fists, flex your legs, tense your shoulders. Hold for 5s, then release all stored tension.',
    duration: 20,
    icon: Zap,
    badgeColor: '#f59e0b',
    tip: 'Progressive tension-and-release discharges trapped fight-or-flight motor energy.'
  },
  {
    title: 'Feel Grounded & Stable',
    tag: 'PROPRIOCEPTIVE INTEGRATION',
    instruction: 'Stand with both feet firmly planted on the ground. Feel all four corners of your feet pressing down. Take three deep breaths and notice your body’s stability and strength.',
    duration: 10,
    icon: Footprints,
    badgeColor: '#10b981',
    tip: 'Bilateral plantar grounding establishes centered gravity and felt physical security.'
  }
];

const TOTAL_GROUNDING_SECONDS = GROUNDING_STEPS.reduce((acc, curr) => acc + curr.duration, 0); // 85s

function BioRadarPhysicalGrounding({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [secondsLeftInStep, setSecondsLeftInStep] = useState<number>(GROUNDING_STEPS[0].duration);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    voiceEnabledRef.current = next;
    audioEngine.setVoiceEnabled(next);
    if (!next) {
      audioEngine.pauseSpeaking();
    } else if (isRunning && !isCompleted) {
      audioEngine.resumeSpeaking();
    }
  };

  const activeStep = GROUNDING_STEPS[stepIndex] || GROUNDING_STEPS[GROUNDING_STEPS.length - 1];
  const StepIcon = activeStep.icon;

  // Calculate cumulative progress percent
  const elapsedPreviousSteps = GROUNDING_STEPS.slice(0, stepIndex).reduce((acc, s) => acc + s.duration, 0);
  const currentStepElapsed = activeStep.duration - secondsLeftInStep;
  const totalElapsed = elapsedPreviousSteps + currentStepElapsed;
  const progressPercent = Math.min(100, Math.max(0, (totalElapsed / TOTAL_GROUNDING_SECONDS) * 100));

  // Timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isCompleted) {
      interval = setInterval(() => {
        setSecondsLeftInStep((prev) => {
          if (prev <= 1) {
            // Step completed
            if (stepIndex < GROUNDING_STEPS.length - 1) {
              const nextIdx = stepIndex + 1;
              setStepIndex(nextIdx);
              if (voiceEnabledRef.current) {
                audioEngine.speak(`${GROUNDING_STEPS[nextIdx].title}. ${GROUNDING_STEPS[nextIdx].instruction}`);
              }
              return GROUNDING_STEPS[nextIdx].duration;
            } else {
              // Sequence finished
              setIsRunning(false);
              setIsCompleted(true);
              audioEngine.playSfx('celebration_chords');
              if (voiceEnabledRef.current) {
                audioEngine.speak('Physical grounding complete. Your body is safely connected and grounded in the present moment.');
              }
              if (onComplete) onComplete({ completed: true, totalSeconds: TOTAL_GROUNDING_SECONDS });
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, stepIndex, isCompleted, onComplete]);

  // Unmount cleanup to stop voice
  useEffect(() => {
    return () => {
      audioEngine.stopSpeaking();
    };
  }, []);

  const handleStart = () => {
    audioEngine.playSfx('tactile_tap');
    if (voiceEnabledRef.current) {
      const step = GROUNDING_STEPS[stepIndex] || GROUNDING_STEPS[0];
      if (secondsLeftInStep === step.duration) {
        audioEngine.speak(`${step.title}. ${step.instruction}`);
      } else {
        audioEngine.resumeSpeaking();
      }
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    audioEngine.playSfx('tactile_tap');
    audioEngine.pauseSpeaking();
    setIsRunning(false);
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    audioEngine.stopSpeaking(true);
    setIsRunning(false);
    setStepIndex(0);
    setSecondsLeftInStep(GROUNDING_STEPS[0].duration);
    setIsCompleted(false);
  };

  const handleSkipStep = () => {
    if (stepIndex < GROUNDING_STEPS.length - 1) {
      const nextIdx = stepIndex + 1;
      setStepIndex(nextIdx);
      setSecondsLeftInStep(GROUNDING_STEPS[nextIdx].duration);
      if (voiceEnabledRef.current) {
        audioEngine.speak(`${GROUNDING_STEPS[nextIdx].title}. ${GROUNDING_STEPS[nextIdx].instruction}`);
      }
    } else {
      setIsRunning(false);
      setIsCompleted(true);
      audioEngine.playSfx('celebration_chords');
      if (voiceEnabledRef.current) {
        audioEngine.speak('Physical grounding complete. Your body is safely connected and grounded in the present moment.');
      }
      if (onComplete) onComplete({ completed: true, totalSeconds: TOTAL_GROUNDING_SECONDS });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. MAIN INTERACTIVE PHYSICAL GROUNDING STAGE
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-3xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xl shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 relative overflow-hidden font-['Plus_Jakarta_Sans'] flex flex-col justify-between p-3.5 sm:p-5 sm:px-6 select-none">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-cyan-500/5 dark:bg-cyan-500/10 blur-3xl pointer-events-none" />
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

        {/* IDLE / START SCREEN */}
        {!isRunning && !isCompleted && stepIndex === 0 && secondsLeftInStep === GROUNDING_STEPS[0].duration ? (
          <div className="max-w-lg mx-auto text-center space-y-3 py-3 sm:py-4 my-auto animate-fade-in z-10">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              A Somatic Grounding practice that uses physical awareness to anchor you in the present moment.
            </p>

            {/* Concentric Sensory Ripples Preview Box */}
            <div className="flex justify-center py-1.5">
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-100 via-indigo-50 to-cyan-50 dark:from-purple-950/50 dark:via-indigo-950/40 dark:to-cyan-950/40 border-2 border-[#5e2be2]/30 dark:border-purple-500/30 shadow-md shadow-purple-500/10 flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-2 border border-[#5e2be2]/20 dark:border-purple-400/20 rounded-xl animate-pulse duration-[3000ms]" />
                <span className="text-2xl font-black text-[#5e2be2] dark:text-purple-300">15</span>
                <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Seconds</span>
              </div>
            </div>

            <div className="bg-purple-50/70 dark:bg-purple-950/40 border-l-4 border-[#5e2be2] p-2.5 rounded-xl text-center max-w-sm mx-auto">
              <p className="text-xs text-purple-950 dark:text-purple-200 italic font-medium leading-relaxed">
                "Step 1: Cool water or cold surface touch to activate nervous system safety."
              </p>
            </div>

            <div className="pt-1">
              <button
                onClick={handleStart}
                className="px-6 py-2 rounded-full bg-[#5e2be2] hover:bg-[#4f28d9] text-white text-xs font-bold shadow-md shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                Start
              </button>
            </div>
          </div>
        ) : !isCompleted ? (
          /* ACTIVE EXERCISE SCREEN */
          <div className="max-w-xl mx-auto text-center space-y-2.5 py-1 animate-fade-in z-10 w-full">
            {/* Step Counter Pill */}
            <div className="space-y-0.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-block">
                Step {stepIndex + 1} of 5: {activeStep.title}
              </span>
            </div>

            {/* Concentric Sensory Ripples Countdown Box */}
            <div className="flex justify-center py-1">
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-100 via-indigo-50 to-cyan-50 dark:from-purple-950/50 dark:via-indigo-950/40 dark:to-cyan-950/40 border-2 border-[#5e2be2]/30 dark:border-purple-500/30 shadow-md shadow-purple-500/10 flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-2 border border-[#5e2be2]/20 dark:border-purple-400/20 rounded-xl animate-pulse duration-[3000ms]" />
                <span className="text-3xl font-black text-[#5e2be2] dark:text-purple-300">
                  {secondsLeftInStep}
                </span>
                <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Seconds
                </span>
              </div>
            </div>

            {/* Step Instruction Card */}
            <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-1 shadow-2xs max-w-md mx-auto">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: activeStep.badgeColor }}>
                <StepIcon className="w-3.5 h-3.5" />
                <span>{activeStep.tag}</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                {activeStep.instruction}
              </p>
            </div>

            {/* Step Pills Navigator */}
            <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
              {GROUNDING_STEPS.map((s, idx) => {
                const isPast = idx < stepIndex;
                const isCurrent = idx === stepIndex;
                return (
                  <div
                    key={s.title}
                    className={`py-1 px-1 rounded-lg border text-center transition-all ${
                      isCurrent
                        ? 'bg-purple-50 dark:bg-purple-950/70 border-[#5e2be2] text-[#5e2be2] font-bold shadow-2xs'
                        : isPast
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="text-[9px] font-bold truncate">Step {idx + 1}</div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between pt-1 max-w-md mx-auto">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>

              <div className="flex items-center gap-2">
                {isRunning ? (
                  <button
                    onClick={handlePause}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                ) : (
                  <button
                    onClick={handleStart}
                    className="px-4 py-1.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-full font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Resume
                  </button>
                )}
              </div>

              <button
                onClick={handleSkipStep}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Next</span> <ArrowRight className="w-3.5 h-3.5" />
              </button>
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
                Anchored in Safety & Presence
              </h3>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#5e2be2] dark:text-purple-300 mt-0.5">
                Physical Grounding Sequence Complete
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/50 border-l-4 border-[#5e2be2] p-3 rounded-xl text-left shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5e2be2] dark:text-purple-300 mb-0.5">
                ✨ Somatic Integration Summary:
              </p>
              <p className="text-xs text-purple-950 dark:text-purple-100 font-medium italic leading-relaxed">
                By consciously engaging all five physical touch points, your nervous system has sent confirmed safety signals to the vagus nerve, discharging fight-or-flight energy and restoring calm focus.
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
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EDUCATIONAL DESCRIPTION CARD: What is Physical Grounding?
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xl shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Section 1: Overview */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            What is Physical Grounding?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal text-justify">
            Physical Grounding is an evidence-based somatic practice rooted in Somatic Experiencing and trauma-informed cognitive regulation. By deliberately engaging your physical senses through touch, temperature, muscle tension, and posture, you send immediate safety signals to your central nervous system. This halts runaway fight-or-flight cascades, downregulates autonomic arousal, and anchors your attention in present reality.
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
              Follow this 5-stage somatic sequence to discharge stress and re-establish physical equilibrium.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">1</span>
                  Sensory & Cold Shift
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 text-[10px] font-bold">
                  15s
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Apply cool water or touch a cold surface. The thermal contrast activates the mammalian dive reflex to quickly lower heart rate.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">2</span>
                  Tension Release
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 text-[10px] font-bold">
                  20s
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Clench fists and engage isometric muscle contraction, then release completely to flush out stored adrenaline.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-[#5e2be2]/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">3</span>
                  Tactile & Plantar Anchor
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-purple-950 text-[#5e2be2] dark:text-purple-300 text-[10px] font-bold">
                  50s
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Map tactile textures, apply soothing heart pressure, and plant both feet firmly on the ground to establish grounded security.
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
              Clinically verified psychological and somatic benefits of physical grounding:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Brain className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Interrupts Mental Spirals</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Directs prefrontal neural processing toward real-time sensory inputs, interrupting intrusive thoughts and panic.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Discharges Fight-or-Flight</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Tension and release mechanics dissipate excess adrenaline and motor tension from the musculoskeletal system.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <Heart className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Stimulates Vagal Safety</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Gentle chest pressure and thermal touch stimulate the vagus nerve, fostering feelings of security and warmth.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 hover:border-[#5e2be2]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Restores Bodily Agency</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  Re-establishes conscious control over your physical posture, creating immediate stability and felt confidence.
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
            Physical Grounding rapidly restores mind-body balance during moments of stress or dissociation. Practicing regularly builds long-term autonomic resilience.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-13: PREFRONTAL COGNITIVE GROUNDING ENGINE
   Reference: https://moodlift.hexpertify.com/games/cognitive-grounding
   ───────────────────────────────────────────────────────────── */
interface CategoryChallenge {
  title: string;
  emoji: string;
  itemsNeeded: number;
  examples: string[];
}

const CATEGORY_CHALLENGES: CategoryChallenge[] = [
  { title: 'Animals with 4 Legs', emoji: '🦁', itemsNeeded: 5, examples: ['Lion', 'Elephant', 'Horse', 'Dog', 'Tiger'] },
  { title: 'Red or Orange Foods', emoji: '🍎', itemsNeeded: 5, examples: ['Apple', 'Carrot', 'Strawberry', 'Orange', 'Tomato'] },
  { title: 'World Capital Cities', emoji: '✈️', itemsNeeded: 5, examples: ['Tokyo', 'Paris', 'London', 'Berlin', 'New Delhi'] },
  { title: 'Movie or Book Titles', emoji: '🎬', itemsNeeded: 5, examples: ['Inception', 'The Matrix', 'Avatar', 'Interstellar', 'Gladiator'] },
  { title: 'Musical Instruments', emoji: '🎸', itemsNeeded: 5, examples: ['Guitar', 'Piano', 'Violin', 'Drums', 'Flute'] }
];

const REVERSE_SPELL_WORDS = [
  { word: 'GROUNDING', reversed: 'G • N • I • D • N • U • O • R • G', length: 9 },
  { word: 'CALMNESS', reversed: 'S • S • E • N • M • L • A • C', length: 8 },
  { word: 'RESILIENT', reversed: 'T • N • E • I • L • I • S • E • R', length: 9 },
  { word: 'PEACEFUL', reversed: 'L • U • F • E • C • A • E • P', length: 8 },
  { word: 'CLARITY', reversed: 'Y • T • I • R • A • L • C', length: 7 }
];

const ALPHABET_CHAIN = [
  { letter: 'A', word: 'Air & Awareness', example: 'Feeling the cool air fill my lungs.' },
  { letter: 'B', word: 'Breathe & Body', example: 'Anchoring into physical sensation.' },
  { letter: 'C', word: 'Calm & Centered', example: 'Allowing stillness to expand.' },
  { letter: 'D', word: 'Deep Diaphragm', example: 'Dropping attention below the belly button.' },
  { letter: 'E', word: 'Earth & Energy', example: 'Grounded firmly into the floor.' },
  { letter: 'F', word: 'Focus & Freedom', example: 'Releasing unneeded mental static.' },
  { letter: 'G', word: 'Grounded & Grateful', example: 'Present in this immediate reality.' }
];

function PrefrontalCognitiveArcade({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [mode, setMode] = useState<'menu' | 'categories' | 'countdown' | 'alphabet' | 'spell' | 'reality'>('menu');
  const [timerDuration, setTimerDuration] = useState<number>(60);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    voiceEnabledRef.current = next;
    audioEngine.setVoiceEnabled(next);
    if (!next) {
      audioEngine.stopSpeaking();
    }
  };

  const [completedDrillCount, setCompletedDrillCount] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Unmount cleanup to stop voice
  useEffect(() => {
    return () => {
      audioEngine.stopSpeaking();
    };
  }, []);

  // Category Blitz State
  const [catIndex, setCatIndex] = useState<number>(0);
  const [checkedItemsCount, setCheckedItemsCount] = useState<number>(0);

  // Subtraction State (Reverse 7s)
  const [subtractionStep, setSubtractionStep] = useState<number>(0);
  const subtractionChain = [100, 93, 86, 79, 72, 65, 58, 51, 44, 37, 30, 23, 16, 9, 2];

  // Alphabet State
  const [alphaIndex, setAlphaIndex] = useState<number>(0);

  // Reverse Spell State
  const [spellIndex, setSpellIndex] = useState<number>(0);
  const [revealedChars, setRevealedChars] = useState<number>(0);

  // Reality Anchor State
  const [realityAnswers, setRealityAnswers] = useState({
    day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    roomItem1: '',
    roomItem2: '',
    roomItem3: '',
    temperature: 'Comfortable & Stable'
  });

  // Timer Countdown Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleCompleteDrill();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, secondsRemaining]);

  const handleStartMode = (selectedMode: 'categories' | 'countdown' | 'alphabet' | 'spell' | 'reality') => {
    audioEngine.playSfx('sonar_ping');
    setMode(selectedMode);
    setSecondsRemaining(timerDuration);
    setIsActive(true);
    setCheckedItemsCount(0);
    setSubtractionStep(0);
    setAlphaIndex(0);
    setSpellIndex(0);
    setRevealedChars(0);

    if (voiceEnabledRef.current) {
      if (selectedMode === 'categories') {
        audioEngine.speak(`Category Blitz. Name ${CATEGORY_CHALLENGES[0].itemsNeeded} ${CATEGORY_CHALLENGES[0].title} out loud.`);
      } else if (selectedMode === 'countdown') {
        audioEngine.speak('Reverse Subtraction. Count down from 100 by sevens.');
      } else if (selectedMode === 'alphabet') {
        audioEngine.speak('Alphabet Concept Chain. Follow each letter to ground your attention.');
      } else if (selectedMode === 'spell') {
        audioEngine.speak('Reverse Word Spelling. Read each letter backwards.');
      } else if (selectedMode === 'reality') {
        audioEngine.speak('Concrete Reality Anchoring. Verify your immediate physical facts.');
      }
    }
  };

  const handleCompleteDrill = () => {
    setIsActive(false);
    audioEngine.playSfx('celebration_chords');
    setCompletedDrillCount((prev) => prev + 1);
    if (voiceEnabledRef.current) {
      audioEngine.speak('Cognitive grounding complete. Prefrontal executive control restored.');
    }
  };

  const handleFinishAll = () => {
    setIsCompleted(true);
    audioEngine.playSfx('celebration_chords');
    if (onComplete) {
      onComplete({ completedDrills: completedDrillCount + 1 });
    }
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    audioEngine.stopSpeaking();
    setMode('menu');
    setIsActive(false);
    setSecondsRemaining(timerDuration);
    setCheckedItemsCount(0);
    setSubtractionStep(0);
    setAlphaIndex(0);
    setSpellIndex(0);
    setIsCompleted(false);
  };

  // Prefrontal activation percentage calculation
  const prefrontalPercentage = Math.min(
    100,
    Math.round(((timerDuration - secondsRemaining) / timerDuration) * 60 + checkedItemsCount * 8 + subtractionStep * 3 + completedDrillCount * 20)
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ─────────────────────────────────────────────────────────────
          1. INTERACTIVE COGNITIVE GROUNDING CONTAINER
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xl shadow-purple-500/5 border border-slate-200/80 dark:border-slate-800 relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-end px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 relative z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleVoice}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
              title="Toggle Voice Guidance"
            >
              {voiceEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-[#5e2be2]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{voiceEnabled ? 'Voice On' : 'Muted'}</span>
            </button>

            <button
              onClick={handleReset}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
              title="Restart Exercise"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Interactive Container */}
        <div className="p-4 sm:p-6 relative z-10">
          {!isCompleted ? (
            <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
              {/* Executive Focus Meter (Cortical Activation) */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-cyan-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-cyan-950/30 border border-purple-200/70 dark:border-purple-800/60 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <Zap className="w-4 h-4 text-amber-500 fill-current animate-bounce" />
                  <span>Prefrontal Executive Activation:</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-28 sm:w-32 h-2.5 bg-white dark:bg-slate-800 rounded-full overflow-hidden border border-purple-200 dark:border-purple-800">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-[#5e2be2] to-emerald-400 transition-all duration-500 rounded-full"
                      style={{ width: `${Math.max(15, prefrontalPercentage)}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-[#5e2be2] dark:text-purple-300 min-w-[36px] text-right">
                    {Math.max(15, prefrontalPercentage)}%
                  </span>
                </div>
              </div>

              {/* 🎯 MODE SELECTION MENU */}
              {mode === 'menu' && (
                <div className="space-y-4 text-center animate-fade-in">
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      Select a Working Memory Challenge
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      Cognitive drills disrupt intrusive rumination by requiring immediate working-memory computation.
                    </p>
                  </div>

                  {/* Duration Picker */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs font-bold text-slate-400">Challenge Duration:</span>
                    {[30, 60, 90].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => {
                          audioEngine.playSfx('tactile_tap');
                          setTimerDuration(sec);
                          setSecondsRemaining(sec);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                          timerDuration === sec
                            ? 'bg-[#5e2be2] text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>

                  {/* 5 Interactive Drill Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-1">
                    <button
                      onClick={() => handleStartMode('categories')}
                      className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-[#5e2be2] dark:hover:border-purple-400 transition-all space-y-1.5 cursor-pointer shadow-sm group text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">🦁</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200">
                          RECALL
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-[#5e2be2] transition-colors">
                        Category Blitz
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Name 5 specific items in random categories out loud or tap to check them off.
                      </p>
                    </button>

                    <button
                      onClick={() => handleStartMode('countdown')}
                      className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-[#5e2be2] dark:hover:border-purple-400 transition-all space-y-1.5 cursor-pointer shadow-sm group text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">🔢</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200">
                          CALCULATION
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-[#5e2be2] transition-colors">
                        Reverse 7s Subtraction
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Count down from 100 by sevens: 100 ➔ 93 ➔ 86 ➔ 79 ➔ 72 to force mental engagement.
                      </p>
                    </button>

                    <button
                      onClick={() => handleStartMode('alphabet')}
                      className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-[#5e2be2] dark:hover:border-purple-400 transition-all space-y-1.5 cursor-pointer shadow-sm group text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">🔤</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-[#5e2be2] dark:text-purple-300 border border-purple-200">
                          SEQUENCING
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-[#5e2be2] transition-colors">
                        Alphabet Concept Chain
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Step through letters A to G with grounding, peaceful concepts for each.
                      </p>
                    </button>

                    <button
                      onClick={() => handleStartMode('spell')}
                      className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-[#5e2be2] dark:hover:border-purple-400 transition-all space-y-1.5 cursor-pointer shadow-sm group text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">🧩</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200">
                          ORTHOGRAPHIC
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-[#5e2be2] transition-colors">
                        Spell Backwards
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Spell words like G-R-O-U-N-D-I-N-G backwards to hijack wandering thoughts.
                      </p>
                    </button>

                    <button
                      onClick={() => handleStartMode('reality')}
                      className="sm:col-span-2 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-[#5e2be2] dark:hover:border-purple-400 transition-all space-y-1.5 cursor-pointer shadow-sm group text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">📍</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                          REALITY TETHER
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-[#5e2be2] transition-colors">
                        Concrete Reality Anchor Facts
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Verify today's date, 3 exact physical room objects, and your physical environment.
                      </p>
                    </button>
                  </div>
                </div>
              )}

            {/* 🦁 MODE 1: CATEGORY BLITZ */}
            {mode === 'categories' && (
              <div className="space-y-6 text-center animate-fade-in">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-500">
                  <span>Category {catIndex + 1} of {CATEGORY_CHALLENGES.length}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-black">⏱️ {secondsRemaining}s remaining</span>
                </div>

                <div className="p-8 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-purple-700 text-white shadow-xl shadow-amber-500/20 space-y-4">
                  <span className="text-4xl block animate-bounce">{CATEGORY_CHALLENGES[catIndex].emoji}</span>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-200">
                      Name {CATEGORY_CHALLENGES[catIndex].itemsNeeded} Items Out Loud
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black">
                      {CATEGORY_CHALLENGES[catIndex].title}
                    </h3>
                  </div>

                  {/* 5 Tap-to-Check Counter Chips */}
                  <div className="flex justify-center gap-2 pt-2">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const isChecked = checkedItemsCount >= num;
                      return (
                        <button
                          key={num}
                          onClick={() => {
                            audioEngine.playSfx('neural_sparkle');
                            setCheckedItemsCount(num);
                          }}
                          className={`w-11 h-11 rounded-2xl font-black text-sm transition-all cursor-pointer flex items-center justify-center ${
                            isChecked
                              ? 'bg-white text-amber-600 shadow-md scale-105 ring-2 ring-white'
                              : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md'
                          }`}
                        >
                          {isChecked ? '✓' : num}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-amber-100/90 pt-1 italic">
                    💡 Examples: {CATEGORY_CHALLENGES[catIndex].examples.slice(0, 3).join(', ')}...
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      audioEngine.playSfx('sonar_ping');
                      if (catIndex < CATEGORY_CHALLENGES.length - 1) {
                        setCatIndex(catIndex + 1);
                        setCheckedItemsCount(0);
                      } else {
                        handleCompleteDrill();
                      }
                    }}
                    className="px-8 py-3.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
                  >
                    {catIndex < CATEGORY_CHALLENGES.length - 1 ? 'Next Category →' : 'Complete Drill'}
                  </button>
                  <button
                    onClick={() => setMode('menu')}
                    className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl cursor-pointer"
                  >
                    Menu
                  </button>
                </div>
              </div>
            )}

            {/* 🔢 MODE 2: REVERSE 7s SUBTRACTION */}
            {mode === 'countdown' && (
              <div className="space-y-6 text-center animate-fade-in">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-500">
                  <span>Step {subtractionStep + 1} of {subtractionChain.length}</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-black">⏱️ {secondsRemaining}s remaining</span>
                </div>

                <div className="p-8 rounded-3xl bg-gradient-to-br from-cyan-600 via-indigo-600 to-[#5e2be2] text-white shadow-xl shadow-cyan-500/20 space-y-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-200">
                    Mental Math Protocol • Subtract 7
                  </span>

                  <div className="py-4">
                    <span className="text-6xl sm:text-7xl font-black tracking-tight text-white drop-shadow-md">
                      {subtractionChain[subtractionStep]}
                    </span>
                    {subtractionStep < subtractionChain.length - 1 && (
                      <span className="text-xs text-cyan-200 block mt-2 font-bold">
                        What is {subtractionChain[subtractionStep]} minus 7?
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      audioEngine.playSfx('neural_sparkle');
                      if (subtractionStep < subtractionChain.length - 1) {
                        setSubtractionStep(subtractionStep + 1);
                      } else {
                        handleCompleteDrill();
                      }
                    }}
                    className="px-8 py-3.5 bg-white hover:bg-cyan-50 text-cyan-700 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer hover:scale-105"
                  >
                    {subtractionStep < subtractionChain.length - 1 ? 'Reveal Next (-7)' : 'Finished Sequence!'}
                  </button>
                </div>

                <button
                  onClick={() => setMode('menu')}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl cursor-pointer"
                >
                  Return to Menu
                </button>
              </div>
            )}

            {/* 🔤 MODE 3: ALPHABET CONCEPT CHAIN */}
            {mode === 'alphabet' && (
              <div className="space-y-6 text-center animate-fade-in">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-500">
                  <span>Letter {alphaIndex + 1} of {ALPHABET_CHAIN.length}</span>
                  <span className="text-purple-600 dark:text-purple-400 font-black">⏱️ {secondsRemaining}s remaining</span>
                </div>

                <div className="p-8 rounded-3xl bg-gradient-to-br from-[#5e2be2] via-purple-600 to-fuchsia-600 text-white shadow-xl shadow-purple-500/20 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-3xl font-black mx-auto backdrop-blur-md">
                    {ALPHABET_CHAIN[alphaIndex].letter}
                  </div>

                  <h3 className="text-2xl font-black">
                    {ALPHABET_CHAIN[alphaIndex].word}
                  </h3>

                  <p className="text-xs text-purple-100/90 max-w-sm mx-auto font-medium">
                    "{ALPHABET_CHAIN[alphaIndex].example}"
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      audioEngine.playSfx('sonar_ping');
                      if (alphaIndex < ALPHABET_CHAIN.length - 1) {
                        setAlphaIndex(alphaIndex + 1);
                      } else {
                        handleCompleteDrill();
                      }
                    }}
                    className="px-8 py-3.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
                  >
                    {alphaIndex < ALPHABET_CHAIN.length - 1 ? 'Next Letter →' : 'Complete Alphabet Chain'}
                  </button>
                  <button
                    onClick={() => setMode('menu')}
                    className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl cursor-pointer"
                  >
                    Menu
                  </button>
                </div>
              </div>
            )}

            {/* 🧩 MODE 4: SPELL BACKWARDS */}
            {mode === 'spell' && (
              <div className="space-y-6 text-center animate-fade-in">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-500">
                  <span>Word {spellIndex + 1} of {REVERSE_SPELL_WORDS.length}</span>
                  <span className="text-fuchsia-600 font-black">⏱️ {secondsRemaining}s remaining</span>
                </div>

                <div className="p-8 rounded-3xl bg-gradient-to-br from-fuchsia-600 via-indigo-600 to-[#5e2be2] text-white shadow-xl shadow-fuchsia-500/20 space-y-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-fuchsia-200">
                    Spell Word Backwards
                  </span>

                  <div className="py-2">
                    <span className="text-3xl sm:text-4xl font-black tracking-widest block text-white">
                      {REVERSE_SPELL_WORDS[spellIndex].word}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                    <span className="text-[11px] font-bold text-fuchsia-200 block mb-1">Reversed Spelling:</span>
                    <span className="text-lg font-black tracking-widest text-white">
                      {REVERSE_SPELL_WORDS[spellIndex].reversed}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      audioEngine.playSfx('neural_sparkle');
                      if (spellIndex < REVERSE_SPELL_WORDS.length - 1) {
                        setSpellIndex(spellIndex + 1);
                      } else {
                        handleCompleteDrill();
                      }
                    }}
                    className="px-8 py-3.5 bg-white hover:bg-fuchsia-50 text-fuchsia-700 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer"
                  >
                    {spellIndex < REVERSE_SPELL_WORDS.length - 1 ? 'Next Word →' : 'Complete Spelling Drill'}
                  </button>
                </div>

                <button
                  onClick={() => setMode('menu')}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl cursor-pointer"
                >
                  Return to Menu
                </button>
              </div>
            )}

            {/* 📍 MODE 5: CONCRETE REALITY ANCHOR FACTS */}
            {mode === 'reality' && (
              <div className="space-y-6 text-center animate-fade-in">
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-800 text-white shadow-xl shadow-emerald-500/20 text-left space-y-4">
                  <div className="text-center space-y-1">
                    <span className="text-3xl">📍</span>
                    <h3 className="text-xl sm:text-2xl font-black">Present Reality Anchoring</h3>
                    <p className="text-xs text-emerald-100">Confirm physical facts about your immediate environment.</p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-white/10 rounded-2xl border border-white/15">
                      <span className="text-[10px] font-bold uppercase text-emerald-200 block">Today's Day & Date:</span>
                      <span className="text-sm font-black text-white">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-emerald-100 block">
                        Name 3 exact objects in front of you right now:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. White coffee mug, Keyboard, Water bottle"
                        value={realityAnswers.roomItem1}
                        onChange={(e) => setRealityAnswers({ ...realityAnswers, roomItem1: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white/15 border border-white/20 rounded-xl text-xs text-white placeholder-white/50 focus:outline-none focus:bg-white/25 font-bold"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleCompleteDrill}
                    className="w-full py-3.5 bg-white hover:bg-emerald-50 text-emerald-800 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer text-center"
                  >
                    Confirm Anchor to Present Moment
                  </button>
                </div>

                <button
                  onClick={() => setMode('menu')}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl cursor-pointer"
                >
                  Return to Menu
                </button>
              </div>
            )}

            {/* Quick Completion Button if drill is done */}
            {completedDrillCount > 0 && mode === 'menu' && (
              <div className="pt-2 text-center">
                <button
                  onClick={handleFinishAll}
                  className="px-9 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
                >
                  <CheckCircle2 className="w-4 h-4" /> Finish & Log Cognitive Grounding ({completedDrillCount} Drills Completed)
                </button>
              </div>
            )}
          </div>
        ) : (
          /* COMPLETION CELEBRATION */
          <div className="max-w-xl mx-auto text-center space-y-6 py-6 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-[#5e2be2] p-0.5 mx-auto shadow-xl shadow-purple-500/20 flex items-center justify-center">
              <div className="w-full h-full rounded-3xl bg-white dark:bg-slate-900 flex items-center justify-center text-4xl text-[#5e2be2]">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ✓ Cognitive Executive Grounding Complete
              </span>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                Prefrontal Focus Restored
              </h2>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/50 border-l-4 border-[#5e2be2] p-5 sm:p-6 rounded-2xl text-left shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#5e2be2] dark:text-purple-300 mb-1.5">
                ✨ Neuro-Cognitive Integration Summary:
              </p>
              <p className="text-xs sm:text-sm text-purple-950 dark:text-purple-100 font-medium leading-relaxed">
                By completing structured working-memory tasks, you successfully shifted cognitive blood flow from the reactive amygdala to the rational dorsolateral prefrontal cortex. Emotional rumination has been interrupted with grounded present focus.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleReset}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Practice Another Drill
              </button>
              <button
                onClick={() => {
                  if (onComplete) onComplete({ completed: true, drillsCompleted: completedDrillCount });
                }}
                className="flex-1 py-3.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Return to Activities
              </button>
            </div>
          </div>
        )}
      </div>

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
            Cognitive Grounding is an evidence-based neuropsychological intervention designed to interrupt acute anxiety, panic escalation, and intrusive rumination loops. When emotional distress spikes, the brain's <strong>limbic system (amygdala)</strong> consumes neural bandwidth, triggering fight-or-flight reactions. By deliberately engaging in high-demand, structured mental tasks—such as category retrieval, serial calculation, and spatial observation—cognitive grounding activates the <strong>dorsolateral prefrontal cortex (dlPFC)</strong>. Through competitive neuro-metabolic recruitment, blood flow and glucose are redirected away from emotional panic centers back toward rational executive control.
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
              Follow these structured cognitive drills to disrupt emotional looping and restore cortical executive balance:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  1
                </span>
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider">
                  Category Retrieval
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Rapidly identify and name items in targeted semantic categories. Searching long-term memory forces active prefrontal computation and breaks intrusive thought cycles.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-2.5 hover:border-[#5e2be2]/40 transition-colors shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  2
                </span>
                <span className="text-xs font-black text-[#5e2be2] uppercase tracking-wider">
                  Serial Working Memory
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                Execute reverse arithmetic (such as subtracting 7s) or backward spelling. Multi-step calculation requires dedicated cognitive bandwidth that cannot co-exist with panic.
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
                Observe concrete sensory landmarks in your immediate environment. Grounding in physical reality signals to the nervous system that you are safe in the present moment.
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
              Evidence-based neurological outcomes of competitive prefrontal activation:
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
                  Pairing concrete mental challenges with reality re-anchoring swiftly down-regulates sympathetic nervous system overdrive within 60 to 90 seconds.
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
            Cognitive drills act as an immediate neurobiological circuit breaker. You cannot panic and calculate simultaneously—your brain is biologically wired to prioritize the active cognitive computation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MoodLiftMindfulnessGrounding;
