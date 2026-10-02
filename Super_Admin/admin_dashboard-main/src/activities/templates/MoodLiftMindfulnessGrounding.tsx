import React, { useState, useEffect } from 'react';
import {
  Brain,
  Eye,
  Hand,
  Volume2,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Heart,
  Zap,
  Tag,
  Compass,
  Radio,
  Target
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';
import { audioEngine } from '../utils/therapeuticAudioEngine';

interface MindfulnessActivityProps extends BaseActivityComponentProps {
  activityId?: string;
}

export const MoodLiftMindfulnessGrounding: React.FC<MindfulnessActivityProps> = ({
  activityId = 'ACT-05',
  activityName,
  onComplete
}) => {
  if (activityId === 'ACT-05') {
    return <SensoryRoomScanner activityName={activityName} onComplete={onComplete} />;
  } else if (activityId === 'ACT-06') {
    return <EmotionalResonanceCompass activityName={activityName} onComplete={onComplete} />;
  } else if (activityId === 'ACT-07') {
    return <BioRadarPhysicalGrounding activityName={activityName} onComplete={onComplete} />;
  } else {
    return <PrefrontalCognitiveArcade activityName={activityName} onComplete={onComplete} />;
  }
};

/* ─────────────────────────────────────────────────────────────
   ACT-05: SENSORY ROOM SCANNER (Objective Environmental Grounding)
   ───────────────────────────────────────────────────────────── */
function SensoryRoomScanner({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [step, setStep] = useState<number>(1);
  const [items, setItems] = useState({
    item1: { name: '', color: '', texture: '', lightReflection: '' },
    item2: { name: '', color: '', texture: '', lightReflection: '' },
    item3: { name: '', color: '', texture: '', lightReflection: '' }
  });
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const currentKey = `item${step}` as keyof typeof items;

  const handleNext = () => {
    audioEngine.playSfx('sonar_ping');
    if (step < 3) {
      setStep(step + 1);
      audioEngine.speak(`Target object ${step + 1}. Look around and describe its details.`);
    } else {
      setIsCompleted(true);
      audioEngine.playSfx('celebration_chords');
      audioEngine.speak('Environmental scan complete. You are fully present in this room.');
      if (onComplete) onComplete({ items });
    }
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    setStep(1);
    setItems({
      item1: { name: '', color: '', texture: '', lightReflection: '' },
      item2: { name: '', color: '', texture: '', lightReflection: '' },
      item3: { name: '', color: '', texture: '', lightReflection: '' }
    });
    setIsCompleted(false);
  };

  return (
    <div className="w-full rounded-3xl bg-white p-6 sm:p-8 text-slate-800 shadow-xl shadow-purple-500/5 border border-slate-100 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#5e2be2]/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-cyan-50 rounded-2xl border border-cyan-100 text-cyan-600 shadow-inner">
            <Target className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200">
              ACT-05 • SENSORY FOCUS RADAR
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {activityName || 'Describe Your Room'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Shift cognitive load from rumination to micro-environmental visual cataloging.
            </p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs transition-all cursor-pointer">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!isCompleted ? (
        <div className="max-w-xl mx-auto space-y-6 relative z-10">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-700">
            <span>Visual Scanning Target {step} of 3</span>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-[10px] font-black text-cyan-700">
              {Math.round((step / 3) * 100)}% COMPLETE
            </span>
          </div>

          <div className="p-6 bg-slate-50/90 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <Compass className="w-4 h-4 text-cyan-600" />
                Target an Object in Your Immediate Physical Space:
              </label>
              <input
                type="text"
                placeholder="e.g. Matte black notebook, Sunlight on wooden desk, Indoor succulent"
                value={items[currentKey].name}
                onChange={(e) => setItems({ ...items, [currentKey]: { ...items[currentKey], name: e.target.value } })}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 font-bold shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Exact Color Tone</label>
                <input
                  type="text"
                  placeholder="e.g. Deep amber gold"
                  value={items[currentKey].color}
                  onChange={(e) => setItems({ ...items, [currentKey]: { ...items[currentKey], color: e.target.value } })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-cyan-500 shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Tactile Texture</label>
                <input
                  type="text"
                  placeholder="e.g. Cool, grainy wood"
                  value={items[currentKey].texture}
                  onChange={(e) => setItems({ ...items, [currentKey]: { ...items[currentKey], texture: e.target.value } })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-cyan-500 shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Light / Shadow Gradient</label>
                <input
                  type="text"
                  placeholder="e.g. Soft diagonal shadow"
                  value={items[currentKey].lightReflection}
                  onChange={(e) => setItems({ ...items, [currentKey]: { ...items[currentKey], lightReflection: e.target.value } })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-cyan-500 shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleNext}
              className="px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-[#5e2be2] hover:opacity-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              {step === 3 ? 'Lock Environmental Scan' : 'Scan Next Object'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-fade-in relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 to-[#5e2be2] p-1 mx-auto shadow-lg shadow-cyan-500/30 flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center text-cyan-600">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">Anchored in Physical Space</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              By mapping 3 distinct environmental targets with granular sensory accuracy, your visual cortex has confirmed real-time physical safety.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Practice Scan Again
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-06: EMOTIONAL RESONANCE COMPASS (Name the Moment)
   ───────────────────────────────────────────────────────────── */
function EmotionalResonanceCompass({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const [intensity, setIntensity] = useState<number>(7);
  const [selfCompassionStatement, setSelfCompassionStatement] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const emotionsList = [
    { label: 'Anxious / Restless', color: '#f59e0b', tag: 'SURGE OF READINESS' },
    { label: 'Cognitively Overwhelmed', color: '#ec4899', tag: 'INPUT SATURATION' },
    { label: 'Self-Critical / Harsh', color: '#8b5cf6', tag: 'JUDGMENT LOOP' },
    { label: 'Depleted / Fatigued', color: '#3b82f6', tag: 'LOW BATTERY' },
    { label: 'Uncertain / Ambivalent', color: '#06b6d4', tag: 'FUTURE DISCOMFORT' },
    { label: 'Frustrated / Blocked', color: '#ef4444', tag: 'BOUNDARY ALERT' }
  ];

  const handleSelectEmotion = (eObj: (typeof emotionsList)[0]) => {
    audioEngine.playSfx('neural_sparkle');
    setSelectedEmotion(eObj.label);
    const stmt = `Even though I am experiencing ${eObj.label.toLowerCase()} right now, I acknowledge this feeling with kindness and know I am safe.`;
    setSelfCompassionStatement(stmt);
    audioEngine.speak(`I feel ${eObj.label}. I accept this feeling with compassion.`);
  };

  const handleFinish = () => {
    audioEngine.playSfx('celebration_chords');
    audioEngine.speak('Emotional validation recorded. Your feeling has been witnessed and honored.');
    setIsCompleted(true);
    if (onComplete) onComplete({ selectedEmotion, intensity, selfCompassionStatement });
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    setSelectedEmotion('');
    setIntensity(7);
    setSelfCompassionStatement('');
    setIsCompleted(false);
  };

  return (
    <div className="w-full rounded-3xl bg-white p-6 sm:p-8 text-slate-800 shadow-xl shadow-purple-500/5 border border-slate-100 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-rose-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 shadow-inner">
            <Heart className="w-6 h-6 animate-pulse text-rose-500" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-[#5e2be2] border border-purple-100">
              ACT-06 • AMYGDALA DOWNREGULATION
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {activityName || 'Name the Moment'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              "Name it to tame it" — verbalizing somatic states triggers immediate prefrontal inhibition of the amygdala.
            </p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs transition-all cursor-pointer">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!isCompleted ? (
        <div className="max-w-xl mx-auto space-y-6 relative z-10">
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-rose-500" /> 1. Accurately Label Your Core Emotional State:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {emotionsList.map((e) => (
                <button
                  key={e.label}
                  onClick={() => handleSelectEmotion(e)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedEmotion === e.label
                      ? 'bg-purple-50 border-[#5e2be2] text-[#5e2be2] shadow-md shadow-purple-500/10 ring-2 ring-[#5e2be2]/30'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="font-black text-xs text-slate-900">{e.label}</div>
                  <div className="text-[9px] font-extrabold uppercase text-slate-400 mt-1">{e.tag}</div>
                </button>
              ))}
            </div>
          </div>

          {selectedEmotion && (
            <div className="space-y-4 p-5 bg-slate-50/90 rounded-3xl border border-slate-200 shadow-sm animate-fade-in">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">2. Somatic Intensity Gauge</span>
                  <span className="text-rose-600 font-black">{intensity} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  3. Neuro-Compassion Script:
                </label>
                <textarea
                  rows={2}
                  value={selfCompassionStatement}
                  onChange={(e) => setSelfCompassionStatement(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 font-medium shadow-sm"
                />
              </div>

              <button
                onClick={handleFinish}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-[#5e2be2] hover:opacity-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
              >
                Honor & Release Emotion <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-fade-in relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-rose-500 to-[#5e2be2] p-1 mx-auto shadow-lg shadow-rose-500/30 flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center text-rose-500">
              <Heart className="w-12 h-12 animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">Affective State Integrated</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 italic">
              "{selfCompassionStatement}"
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Check In Again
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-07: BIO-RADAR PHYSICAL GROUNDING (5-Sense Somatic Sonar)
   ───────────────────────────────────────────────────────────── */
function BioRadarPhysicalGrounding({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const steps = [
    { num: 5, sense: 'SIGHT', icon: Eye, prompt: 'Scan and identify 5 specific visual patterns or colors in your field of view.', voice: 'Notice 5 things you can see right now.', color: '#06b6d4' },
    { num: 4, sense: 'TOUCH', icon: Hand, prompt: 'Feel 4 physical textures (fabric on thighs, solid chair support, feet on floor).', voice: 'Notice 4 physical sensations and textures.', color: '#8b5cf6' },
    { num: 3, sense: 'SOUND', icon: Volume2, prompt: 'Listen closely for 3 distant or subtle acoustic frequencies in the environment.', voice: 'Listen for 3 sounds around you.', color: '#ec4899' },
    { num: 2, sense: 'SMELL', icon: Sparkles, prompt: 'Detect 2 aromas in the room (fresh air, coffee, cedar, or skin scent).', voice: 'Notice 2 scents in the air.', color: '#f59e0b' },
    { num: 1, sense: 'BREATH', icon: Heart, prompt: 'Take 1 slow, deep abdominal breath and note the cool air entering your nostrils.', voice: 'Take 1 deep grounding breath.', color: '#10b981' }
  ];

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const step = steps[currentIdx];
  const StepIcon = step.icon;

  const handleNext = () => {
    audioEngine.playSfx('sonar_ping');
    if (currentIdx < steps.length - 1) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      audioEngine.speak(steps[next].voice);
    } else {
      setIsCompleted(true);
      audioEngine.playSfx('celebration_chords');
      audioEngine.speak('Full 5-sense physical grounding achieved. Your body is safely connected.');
      if (onComplete) onComplete({ completed: true });
    }
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    setCurrentIdx(0);
    setIsCompleted(false);
  };

  return (
    <div className="w-full rounded-3xl bg-white p-6 sm:p-8 text-slate-800 shadow-xl shadow-purple-500/5 border border-slate-100 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-teal-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#5e2be2]/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-teal-50 rounded-2xl border border-teal-100 text-teal-600 shadow-inner">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
              ACT-07 • 5-SENSE RADAR MATRIX
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {activityName || 'Physical Grounding'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Progressively engage all 5 afferent neural pathways to terminate fight-or-flight cascades.
            </p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs transition-all cursor-pointer">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!isCompleted ? (
        <div className="max-w-md mx-auto text-center space-y-6 relative z-10">
          <div
            className="w-32 h-32 rounded-3xl p-1 mx-auto shadow-lg shadow-teal-500/20 flex items-center justify-center transition-all duration-700"
            style={{ background: `linear-gradient(135deg, ${step.color}, #5e2be2)` }}
          >
            <div className="w-full h-full rounded-3xl bg-white flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-slate-900 tracking-tighter">{step.num}</span>
              <span className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: step.color }}>
                {step.sense}
              </span>
            </div>
          </div>

          <div className="p-6 bg-slate-50/90 rounded-3xl border border-slate-200 space-y-2 shadow-sm">
            <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider" style={{ color: step.color }}>
              <StepIcon className="w-4 h-4" /> Somatic Channel {currentIdx + 1} of 5
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{step.prompt}</p>
          </div>

          <button
            onClick={handleNext}
            className="px-10 py-4 bg-gradient-to-r from-teal-600 to-[#5e2be2] hover:opacity-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 transition-all mx-auto cursor-pointer"
          >
            {currentIdx === 4 ? 'Complete Full Grounding' : 'Channel Verified & Sensed'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-fade-in relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-teal-500 to-[#5e2be2] p-1 mx-auto shadow-lg shadow-teal-500/30 flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center text-teal-600">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">Full Afferent Re-Anchoring</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              All 5 physical sensory channels have delivered confirmed safety signals to the thalamus.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Repeat Somatic Scan
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-13: PREFRONTAL COGNITIVE ARCADE (Cognitive Grounding)
   ───────────────────────────────────────────────────────────── */
function PrefrontalCognitiveArcade({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [puzzleType, setPuzzleType] = useState<'categories' | 'countdown' | 'alphabet'>('categories');
  const [timerSeconds, setTimerSeconds] = useState<number>(45);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((prev) => prev - 1), 1000);
    } else if (timerSeconds === 0) {
      setIsActive(false);
      audioEngine.playSfx('celebration_chords');
      audioEngine.speak(`Cognitive drill finished. You recalled ${score} items.`);
      if (onComplete) onComplete({ score, puzzleType });
    }
    return () => clearInterval(interval);
  }, [isActive, timerSeconds, score, puzzleType, onComplete]);

  const handleStart = (type: 'categories' | 'countdown' | 'alphabet') => {
    audioEngine.playSfx('sonar_ping');
    setPuzzleType(type);
    setTimerSeconds(45);
    setScore(0);
    setIsActive(true);
    audioEngine.speak(`Challenge starting. Speak items aloud and tap to count.`);
  };

  const handleItemCount = () => {
    audioEngine.playSfx('neural_sparkle');
    setScore((s) => s + 1);
  };

  return (
    <div className="w-full rounded-3xl bg-white p-6 sm:p-8 text-slate-800 shadow-xl shadow-purple-500/5 border border-slate-100 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-600 shadow-inner">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              ACT-13 • PREFRONTAL FOCUS DRILL
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {activityName || 'Cognitive Grounding'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Force cognitive executive re-engagement via rapid structured working-memory tasks.
            </p>
          </div>
        </div>
      </div>

      {!isActive ? (
        <div className="max-w-xl mx-auto space-y-4 relative z-10">
          <p className="text-xs text-center text-slate-600 font-bold mb-3">
            Select a working-memory challenge protocol to break the loop of emotional distress:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleStart('categories')}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-200 text-left transition-all space-y-2 cursor-pointer shadow-sm"
            >
              <Zap className="w-5 h-5 text-amber-500" />
              <div className="font-black text-xs text-slate-900">Category Blitz</div>
              <div className="text-[10px] text-slate-500 leading-snug">Name 5 green foods, 5 capital cities, 5 movie titles.</div>
            </button>

            <button
              onClick={() => handleStart('countdown')}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-200 text-left transition-all space-y-2 cursor-pointer shadow-sm"
            >
              <Compass className="w-5 h-5 text-cyan-600" />
              <div className="font-black text-xs text-slate-900">Reverse 7s</div>
              <div className="text-[10px] text-slate-500 leading-snug">Count backwards from 100 in decrements of 7.</div>
            </button>

            <button
              onClick={() => handleStart('alphabet')}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-200 text-left transition-all space-y-2 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-5 h-5 text-fuchsia-600" />
              <div className="font-black text-xs text-slate-900">Alpha Chain</div>
              <div className="text-[10px] text-slate-500 leading-snug">Name a calming or empowering concept for A through Z.</div>
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto text-center space-y-6 relative z-10">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-700">
            <span>{puzzleType.toUpperCase()} PROTOCOL</span>
            <span className="text-amber-600 font-black text-sm">{timerSeconds}s REMAINING</span>
          </div>

          <div className="p-6 bg-slate-50/90 rounded-3xl border border-slate-200 space-y-3 shadow-sm">
            {puzzleType === 'categories' && (
              <>
                <div className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Active Challenge</div>
                <div className="text-xl font-black text-slate-900 leading-snug">"Name 5 animals, 5 countries, and 5 book titles out loud"</div>
              </>
            )}
            {puzzleType === 'countdown' && (
              <>
                <div className="text-[10px] font-black text-cyan-600 uppercase tracking-wider">Active Challenge</div>
                <div className="text-2xl font-black text-slate-900 tracking-widest">100 → 93 → 86 → 79 → 72 → 65...</div>
              </>
            )}
            {puzzleType === 'alphabet' && (
              <>
                <div className="text-[10px] font-black text-fuchsia-600 uppercase tracking-wider">Active Challenge</div>
                <div className="text-xl font-black text-slate-900 leading-snug">A (Air) → B (Breathe) → C (Calm) → D (Dawn)...</div>
              </>
            )}

            <div className="pt-3">
              <button
                onClick={handleItemCount}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-[#5e2be2] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                +1 Item Recalled ({score} Total)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MoodLiftMindfulnessGrounding;
