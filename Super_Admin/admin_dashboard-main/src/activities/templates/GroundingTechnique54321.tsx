import React, { useState, useEffect } from 'react';
import {
  Eye,
  Hand,
  Volume2,
  Sparkles,
  Coffee,
  CheckCircle2,
  RefreshCw,
  Wind,
  VolumeX,
  Volume1,
  ArrowRight,
  ArrowLeft,
  Heart,
  Copy,
  Clock,
  Check,
  Activity
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';

export const GroundingTechnique54321: React.FC<BaseActivityComponentProps> = ({
  activityName = '5-4-3-2-1 Sensory Grounding Technique',
  onComplete,
  isReadOnly = false
}) => {
  // Session Stages: 'pre_check' | 'sensory_flow' | 'post_check' | 'completed'
  const [stage, setStage] = useState<'pre_check' | 'sensory_flow' | 'post_check' | 'completed'>('pre_check');
  const [step, setStep] = useState(1);
  const [preAnxiety, setPreAnxiety] = useState<number>(7);
  const [postAnxiety, setPostAnxiety] = useState<number>(3);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const [responses, setResponses] = useState<{
    see: string[];
    feel: string[];
    hear: string[];
    smell: string[];
    taste: string[];
  }>({
    see: ['', '', '', '', ''],
    feel: ['', '', '', ''],
    hear: ['', '', ''],
    smell: ['', ''],
    taste: ['']
  });

  // Timer effect
  useEffect(() => {
    let interval: any = null;
    if (timerActive && stage !== 'completed') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, stage]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  // Play peaceful synth bell tone using Web Audio API
  const playCalmChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Harmonic chord frequencies for gentle meditation bells
      const freqs = [528, 660, 792];
      const freq = freqs[Math.min(step - 1, freqs.length - 1)] || 528;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.3);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  };

  const stepsConfig = [
    {
      step: 1,
      count: 5,
      sense: 'SEE',
      icon: Eye,
      label: '5 Things You Can See',
      themeGradient: 'from-blue-600 via-indigo-600 to-violet-700',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      key: 'see' as const,
      prompt: 'Look around your room or space. Notice colors, patterns, shadows, textures, or small details you usually overlook.',
      suggestions: ['Sunlight through window', 'Texture of the desk', 'Pattern on clothing', 'Wall clock / picture frame', 'Green leaf on a plant']
    },
    {
      step: 2,
      count: 4,
      sense: 'FEEL & TOUCH',
      icon: Hand,
      label: '4 Things You Can Physically Touch',
      themeGradient: 'from-teal-600 via-emerald-600 to-green-700',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      key: 'feel' as const,
      prompt: 'Pay attention to physical contact. Notice how your body rests on your seat, clothes on your skin, or textures under your fingertips.',
      suggestions: ['Smooth surface of table', 'Firm floor supporting feet', 'Soft fabric of chair / shirt', 'Cool ambient air on skin']
    },
    {
      step: 3,
      count: 3,
      sense: 'HEAR',
      icon: Volume2,
      label: '3 Things You Can Hear',
      themeGradient: 'from-purple-600 via-violet-600 to-purple-800',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      key: 'hear' as const,
      prompt: 'Close your eyes for 3 seconds. Tune in to external or subtle ambient sounds you were filtering out.',
      suggestions: ['Gentle hum of AC / fan', 'Rhythm of own breathing', 'Distant chatter / traffic']
    },
    {
      step: 4,
      count: 2,
      sense: 'SMELL',
      icon: Sparkles,
      label: '2 Things You Can Smell',
      themeGradient: 'from-amber-500 via-orange-600 to-amber-700',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      key: 'smell' as const,
      prompt: 'Take a slow, deep breath through your nose. What aromas, fresh air, or scents are present?',
      suggestions: ['Fresh room air / ozone', 'Scent of coffee or tea', 'Hand lotion or soap', 'Pages of a book']
    },
    {
      step: 5,
      count: 1,
      sense: 'TASTE',
      icon: Coffee,
      label: '1 Thing You Can Taste',
      themeGradient: 'from-rose-500 via-pink-600 to-rose-700',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      key: 'taste' as const,
      prompt: 'Notice the lingering taste in your mouth, take a sip of water, or focus on the sensations in your mouth.',
      suggestions: ['Refreshing sip of water', 'Mint or chewing gum', 'Warm tea / coffee', 'Neutral clean palate']
    }
  ];

  const current = stepsConfig[step - 1];

  const handleInputChange = (index: number, value: string) => {
    setResponses((prev) => {
      const updated = [...prev[current.key]];
      updated[index] = value;
      return { ...prev, [current.key]: updated };
    });
  };

  const handleApplySuggestion = (suggestion: string) => {
    setResponses((prev) => {
      const currentList = [...prev[current.key]];
      const emptyIndex = currentList.findIndex((item) => !item.trim());
      if (emptyIndex !== -1) {
        currentList[emptyIndex] = suggestion;
      } else {
        currentList[currentList.length - 1] = suggestion;
      }
      return { ...prev, [current.key]: currentList };
    });
  };

  const startSensoryFlow = () => {
    setStage('sensory_flow');
    setStep(1);
    setTimerActive(true);
    playCalmChime();
  };

  const handleNextStep = () => {
    playCalmChime();
    if (step < 5) {
      setStep(step + 1);
    } else {
      setStage('post_check');
      setTimerActive(false);
    }
  };

  const handleCompleteSession = () => {
    setStage('completed');
    const finalData = {
      preAnxiety,
      postAnxiety,
      reduction: Math.max(0, preAnxiety - postAnxiety),
      durationSeconds: elapsedSeconds,
      responses,
      timestamp: new Date().toISOString()
    };
    if (onComplete) onComplete(finalData);
  };

  const handleReset = () => {
    setStage('pre_check');
    setStep(1);
    setPreAnxiety(7);
    setPostAnxiety(3);
    setElapsedSeconds(0);
    setTimerActive(false);
    setResponses({
      see: ['', '', '', '', ''],
      feel: ['', '', '', ''],
      hear: ['', '', ''],
      smell: ['', ''],
      taste: ['']
    });
  };

  const handleCopySummary = () => {
    const summaryText = `✨ 5-4-3-2-1 Sensory Grounding Session Summary
• Distress Before: ${preAnxiety}/10 ➡️ Distress After: ${postAnxiety}/10 (Improvement: -${Math.max(0, preAnxiety - postAnxiety)} pts)
• Duration: ${formatTimer(elapsedSeconds)}

👁️ 5 Things I Saw:
${responses.see.map((s, i) => `  ${i + 1}. ${s || '(Not specified)'}`).join('\n')}

✋ 4 Things I Touched:
${responses.feel.map((s, i) => `  ${i + 1}. ${s || '(Not specified)'}`).join('\n')}

👂 3 Things I Heard:
${responses.hear.map((s, i) => `  ${i + 1}. ${s || '(Not specified)'}`).join('\n')}

🌸 2 Things I Smelled:
${responses.smell.map((s, i) => `  ${i + 1}. ${s || '(Not specified)'}`).join('\n')}

☕ 1 Thing I Tasted:
  1. ${responses.taste[0] || '(Not specified)'}

Curated by Hexpertify Clinical Wellness`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6 font-['Plus_Jakarta_Sans'] transition-all">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5e2be2] to-purple-500 text-white flex items-center justify-center shadow-lg shadow-[#5e2be2]/25 shrink-0">
            <Wind className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-purple-50 text-[#5e2be2] font-extrabold text-[10px] rounded-full border border-purple-100 uppercase tracking-wider">
                Clinical Mindfulness · ACT-01
              </span>
              <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTimer(elapsedSeconds)}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">{activityName}</h3>
          </div>
        </div>

        {/* Audio Mute & Reset Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-2xl border transition-all text-xs font-bold flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-purple-50 text-[#5e2be2] border-purple-200 hover:bg-purple-100'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
            title={soundEnabled ? 'Chimes Active' : 'Chimes Muted'}
          >
            {soundEnabled ? <Volume1 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chimes On' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-2.5 text-slate-500 hover:text-[#5e2be2] bg-slate-50 hover:bg-purple-50 rounded-2xl border border-slate-200 transition-all active:scale-95"
            title="Reset Session"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ──────────────── STAGE 1: PRE-CHECK DISTRESS ──────────────── */}
      {stage === 'pre_check' && (
        <div className="space-y-6 py-2 animate-fade-in">
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white p-6 rounded-3xl border border-purple-100/80 space-y-3">
            <span className="text-[11px] font-black uppercase text-[#5e2be2] tracking-wider bg-white px-3 py-1 rounded-full shadow-xs border border-purple-100">
              Step 1 of 3 · Initial Somatic Baseline
            </span>
            <h4 className="text-lg sm:text-xl font-extrabold text-slate-900">
              How intense is your current anxiety or distress right now?
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
              Rating your baseline before sensory orientation helps quantify how effectively grounding redirects your sympathetic nervous system.
            </p>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Distress Rating (SUDS 0-10)</span>
              <span className="text-xl font-black text-[#5e2be2] bg-white px-4 py-1.5 rounded-2xl border border-purple-100 shadow-sm">
                {preAnxiety} / 10
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={preAnxiety}
              onChange={(e) => setPreAnxiety(Number(e.target.value))}
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#5e2be2]"
            />

            <div className="flex justify-between text-[11px] font-bold text-slate-500">
              <span>0 · Complete Calm 🧘</span>
              <span>5 · Moderate Tension ⚡</span>
              <span>10 · Severe Overwhelm 🔥</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={startSensoryFlow}
              className="px-8 py-3.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-[#5e2be2]/30 flex items-center gap-2.5 transition-all active:scale-95"
            >
              <span>Begin Sensory Orientation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── STAGE 2: SENSORY FLOW ──────────────── */}
      {stage === 'sensory_flow' && (
        <div className="space-y-6 animate-fade-in">
          {/* Progress Steps Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
              <span className="flex items-center gap-1.5 text-[#5e2be2]">
                <Activity className="w-4 h-4" />
                <span>Sensory Phase {step} of 5</span>
              </span>
              <span className="text-slate-400 font-mono">
                {Math.round((step / 5) * 100)}% Complete
              </span>
            </div>

            <div className="flex items-center gap-2">
              {stepsConfig.map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => {
                    setStep(s.step);
                    playCalmChime();
                  }}
                  className={`h-2.5 flex-1 rounded-full transition-all duration-500 cursor-pointer ${
                    s.step === step
                      ? 'bg-[#5e2be2] ring-2 ring-[#5e2be2]/30'
                      : s.step < step
                      ? 'bg-emerald-400'
                      : 'bg-slate-200'
                  }`}
                  title={s.label}
                />
              ))}
            </div>
          </div>

          {/* Current Sense Interactive Hero Banner */}
          <div className={`p-6 rounded-3xl bg-gradient-to-r ${current.themeGradient} text-white space-y-3 shadow-lg shadow-purple-900/10 transition-all duration-500`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                  Step {step} · {current.sense}
                </span>
                <span className="text-[10px] font-extrabold bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white/90">
                  {current.count} Items Required
                </span>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                <current.icon className="w-5 h-5" />
              </div>
            </div>

            <h4 className="text-xl sm:text-2xl font-black">{current.label}</h4>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium max-w-xl">
              {current.prompt}
            </p>
          </div>

          {/* Suggestions Pill Bar */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Quick Sensory Ideas (Tap to fill):
            </span>
            <div className="flex flex-wrap gap-2">
              {current.suggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplySuggestion(sug)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-purple-50 hover:border-[#5e2be2] hover:text-[#5e2be2] text-slate-600 rounded-xl text-xs font-bold border border-slate-200/80 transition-all active:scale-95 shadow-2xs"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Input Fields */}
          <div className="space-y-3 pt-2">
            {Array.from({ length: current.count }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-1.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 focus-within:border-[#5e2be2] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#5e2be2]/10 transition-all"
              >
                <span className="w-9 h-9 rounded-xl bg-purple-100/70 text-[#5e2be2] font-black text-xs flex items-center justify-center shrink-0 border border-purple-200/60 font-mono">
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={responses[current.key][idx] || ''}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  placeholder={`Describe item #${idx + 1} you ${current.sense.toLowerCase()}...`}
                  className="w-full bg-transparent px-2 py-2 text-xs sm:text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-normal"
                />
                {responses[current.key][idx] && (
                  <Check className="w-4 h-4 text-emerald-500 mr-3 shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setStep(step - 1);
                  playCalmChime();
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl flex items-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Sense</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-3 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-[#5e2be2]/25 flex items-center gap-2 transition-all active:scale-95"
            >
              <span>{step === 5 ? 'Proceed to Post-Session Check ➔' : 'Next Sensory Step ➔'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── STAGE 3: POST-CHECK DISTRESS ──────────────── */}
      {stage === 'post_check' && (
        <div className="space-y-6 py-2 animate-fade-in">
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white p-6 rounded-3xl border border-emerald-100 space-y-3">
            <span className="text-[11px] font-black uppercase text-emerald-700 tracking-wider bg-white px-3 py-1 rounded-full shadow-xs border border-emerald-200">
              Step 3 of 3 · Post-Grounding Calibration
            </span>
            <h4 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Take a slow breath in and out. How do you feel right now?
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
              Compare your somatic feeling now against your initial baseline of <strong>{preAnxiety} / 10</strong>.
            </p>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Post-Session Distress (0-10)</span>
              <span className="text-xl font-black text-emerald-700 bg-white px-4 py-1.5 rounded-2xl border border-emerald-200 shadow-sm">
                {postAnxiety} / 10
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={postAnxiety}
              onChange={(e) => setPostAnxiety(Number(e.target.value))}
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            <div className="flex justify-between text-[11px] font-bold text-slate-500">
              <span>0 · Grounded & Centered 🌿</span>
              <span>5 · Mild Tension</span>
              <span>10 · Severe Distress</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStage('sensory_flow')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Review Senses</span>
            </button>

            <button
              type="button"
              onClick={handleCompleteSession}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center gap-2.5 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Complete & Save Session</span>
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── STAGE 4: COMPLETED SUMMARY CARD ──────────────── */}
      {stage === 'completed' && (
        <div className="space-y-6 animate-fade-in">
          {/* Victory Card */}
          <div className="p-8 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-purple-50 rounded-3xl border border-emerald-200/90 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-600/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-2xl font-black text-slate-900">Grounding Session Successfully Completed!</h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Your nervous system has successfully re-anchored into present physical reality.
              </p>
            </div>

            {/* Delta Metrics Bar */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
              <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Before</span>
                <span className="text-base font-black text-rose-600">{preAnxiety}/10</span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase">After</span>
                <span className="text-base font-black text-emerald-600">{postAnxiety}/10</span>
              </div>
              <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md">
                <span className="text-[10px] font-extrabold text-emerald-100 block uppercase">Relief Delta</span>
                <span className="text-base font-black">
                  {preAnxiety >= postAnxiety ? `-${preAnxiety - postAnxiety} pts` : `+${postAnxiety - preAnxiety}`}
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown of recorded items */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h5 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#5e2be2]" />
                <span>Client Sensory Anchor Breakdown</span>
              </h5>
              <span className="text-xs font-bold text-slate-500">Session Duration: {formatTimer(elapsedSeconds)}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-extrabold text-blue-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> 5 Sights:
                </span>
                <p className="text-slate-600 font-medium">{responses.see.filter(Boolean).join(' • ') || 'None provided'}</p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-extrabold text-emerald-700 flex items-center gap-1.5">
                  <Hand className="w-3.5 h-3.5" /> 4 Physical Touches:
                </span>
                <p className="text-slate-600 font-medium">{responses.feel.filter(Boolean).join(' • ') || 'None provided'}</p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-extrabold text-purple-700 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" /> 3 Sounds:
                </span>
                <p className="text-slate-600 font-medium">{responses.hear.filter(Boolean).join(' • ') || 'None provided'}</p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-extrabold text-amber-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> 2 Scents:
                </span>
                <p className="text-slate-600 font-medium">{responses.smell.filter(Boolean).join(' • ') || 'None provided'}</p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 md:col-span-2 space-y-1.5">
                <span className="font-extrabold text-rose-700 flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5" /> 1 Taste / Oral Anchor:
                </span>
                <p className="text-slate-600 font-medium">{responses.taste.filter(Boolean).join(' • ') || 'None provided'}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-5 py-2.5 bg-purple-50 hover:bg-purple-100 text-[#5e2be2] font-extrabold text-xs rounded-2xl border border-purple-200 flex items-center gap-2 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary Report'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Start Fresh Exercise</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroundingTechnique54321;
