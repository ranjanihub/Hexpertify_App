import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  Square,
  Waves,
  ArrowRightLeft,
  CircleDot
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';
import { audioEngine } from '../utils/therapeuticAudioEngine';

export const MoodLiftBreathingPlayer: React.FC<BaseActivityComponentProps> = ({
  activityId = 'ACT-01',
  activityName,
  onComplete
}) => {
  if (activityId === 'ACT-02') {
    return <BoxBreathingTacticalHUD activityName={activityName} onComplete={onComplete} />;
  } else if (activityId === 'ACT-03') {
    return <OceanWave478Player activityName={activityName} onComplete={onComplete} />;
  } else if (activityId === 'ACT-04') {
    return <AlternateNostrilHemisphericPlayer activityName={activityName} onComplete={onComplete} />;
  } else {
    return <DiaphragmaticBellyPlayer activityName={activityName} onComplete={onComplete} />;
  }
};

/* ─────────────────────────────────────────────────────────────
   ACT-01: DIAPHRAGMATIC BELLY BREATHING (Expanding Abdomen Orb)
   ───────────────────────────────────────────────────────────── */
function DiaphragmaticBellyPlayer({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [phaseIndex, setPhaseIndex] = useState<number>(0);
  const [phaseSecsLeft, setPhaseSecsLeft] = useState<number>(4);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [bellyExpansion, setBellyExpansion] = useState<number>(30); // 30% to 100%

  const phases = [
    { name: 'Inhale (Belly Expand)', duration: 4, voice: 'Inhale through your nose, expanding your lower belly.', cue: 'Push belly gently outward as diaphragm drops down.', targetBelly: 95 },
    { name: 'Gentle Pause', duration: 2, voice: 'Pause softly with dropped shoulders.', cue: 'Rest in the full expansion without strain.', targetBelly: 95 },
    { name: 'Exhale (Belly Retract)', duration: 6, voice: 'Slowly exhale through pursed lips, relaxing your belly.', cue: 'Gently draw belly button back toward spine as air leaves.', targetBelly: 30 }
  ];

  const currentPhase = phases[phaseIndex];

  useEffect(() => {
    let timer: any = null;
    if (isPlaying && !isCompleted) {
      timer = setInterval(() => {
        setPhaseSecsLeft((prev) => {
          if (prev <= 1) {
            const nextIdx = (phaseIndex + 1) % phases.length;
            if (nextIdx === 0) {
              setCompletedCycles((c) => {
                const nextC = c + 1;
                if (nextC >= 5) {
                  setIsPlaying(false);
                  setIsCompleted(true);
                  audioEngine.playSfx('celebration_chords');
                  audioEngine.speak('Diaphragmatic session complete. Vagal stimulation achieved.');
                  if (onComplete) onComplete({ completedCycles: nextC });
                }
                return nextC;
              });
            }
            setPhaseIndex(nextIdx);
            const nextP = phases[nextIdx];
            if (nextIdx === 0) audioEngine.playSfx('inhale_whoosh');
            else if (nextIdx === 2) audioEngine.playSfx('exhale_whoosh');
            else audioEngine.playSfx('singing_bowl');
            if (voiceEnabled) audioEngine.speak(nextP.voice);
            return nextP.duration;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, phaseIndex, isCompleted, voiceEnabled, onComplete]);

  // Smooth visual expansion interpolation
  useEffect(() => {
    if (isPlaying) {
      setBellyExpansion(currentPhase.targetBelly);
    } else {
      setBellyExpansion(45);
    }
  }, [isPlaying, phaseIndex]);

  const handleToggle = () => {
    audioEngine.playSfx('tactile_tap');
    if (!isPlaying) {
      audioEngine.playSfx('inhale_whoosh');
      if (voiceEnabled) audioEngine.speak(currentPhase.voice);
    } else {
      audioEngine.stopSpeaking();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    audioEngine.stopSpeaking();
    setIsPlaying(false);
    setPhaseIndex(0);
    setPhaseSecsLeft(4);
    setCompletedCycles(0);
    setIsCompleted(false);
  };

  return (
    <div className="w-full rounded-3xl bg-white p-6 sm:p-8 text-slate-800 shadow-xl shadow-purple-500/5 border border-slate-100 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 text-[#5e2be2] shadow-sm">
            <CircleDot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-[#5e2be2] border border-purple-100">
              ACT-01 • BELLY EXPANSION PACER
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {activityName || 'Diaphragmatic Breathing'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              4s Inhale • 2s Hold • 6s Exhale (Vagus Nerve Parasympathetic Pacer)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              voiceEnabled ? 'bg-purple-50 border-purple-200 text-[#5e2be2]' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{voiceEnabled ? 'Voice ON' : 'Voice OFF'}</span>
          </button>
          <button onClick={handleReset} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 text-xs transition-all cursor-pointer">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isCompleted ? (
        <div className="max-w-md mx-auto text-center space-y-6 relative z-10 py-2">
          {/* Unique Belly Expansion Graphic */}
          <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
            {/* Outer Rib Cage Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-purple-200 animate-spin-slow" />
            
            {/* Diaphragm Dome Base */}
            <div className="absolute bottom-2 w-48 h-12 rounded-t-full bg-purple-100/60 border border-purple-200/80 flex items-center justify-center">
              <span className="text-[9px] font-black uppercase text-purple-700 tracking-wider">Diaphragm Floor</span>
            </div>

            {/* Pulsing Abdominal Sphere */}
            <div
              className="rounded-full bg-gradient-to-tr from-[#5e2be2] via-indigo-500 to-cyan-400 shadow-xl shadow-purple-500/20 flex flex-col items-center justify-center text-white transition-all duration-1000 ease-out"
              style={{
                width: `${110 + bellyExpansion * 1.2}px`,
                height: `${110 + bellyExpansion * 1.2}px`
              }}
            >
              <span className="text-xs font-black uppercase tracking-wider opacity-90">{isPlaying ? currentPhase.name.split(' ')[0] : 'Ready'}</span>
              <span className="text-4xl font-black tracking-tight">{isPlaying ? phaseSecsLeft : 'Start'}</span>
              <span className="text-[9px] font-bold opacity-80">{isPlaying ? `${currentPhase.duration}s` : 'Click below'}</span>
            </div>
          </div>

          {/* Clinical Somatic Cue Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1 shadow-sm">
            <div className="text-[10px] uppercase font-black tracking-wider text-[#5e2be2] flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Abdominal Technique Focus
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-800">{isPlaying ? currentPhase.cue : 'Place one hand on your chest and one on your belly. Only the belly hand should rise.'}</p>
          </div>

          {/* Controls & Progress */}
          <div className="space-y-4">
            <button
              onClick={handleToggle}
              className="px-10 py-4 bg-gradient-to-r from-[#5e2be2] to-indigo-600 hover:from-[#5022c4] text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all mx-auto cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'Pause Diaphragmatic Breath' : 'Begin Diaphragmatic Flow'}
            </button>

            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Completed: {completedCycles} / 5 Cycles</span>
              <span className="text-[#5e2be2] font-black">{Math.round((completedCycles / 5) * 100)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-fade-in relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-purple-50 border border-purple-100 p-1 mx-auto shadow-lg shadow-purple-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center text-[#5e2be2]">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Vagal Tone Stimulated</h3>
            <p className="text-xs text-slate-600 mt-1">
              Your deep diaphragmatic breathing stimulated the vagus nerve and initiated parasympathetic relaxation.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Practice Again
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-02: BOX BREATHING TACTICAL HUD (4-Sided Perimeter Laser)
   ───────────────────────────────────────────────────────────── */
function BoxBreathingTacticalHUD({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [sideIndex, setSideIndex] = useState<number>(0); // 0=Top(Inhale), 1=Right(Hold), 2=Bottom(Exhale), 3=Left(Hold)
  const [secondsLeft, setSecondsLeft] = useState<number>(4);
  const [completedBoxes, setCompletedBoxes] = useState<number>(0);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const sides = [
    { name: 'Top: Inhale', desc: 'Inhale smoothly for 4 seconds', voice: 'Inhale for four seconds.', color: '#4f46e5' },
    { name: 'Right: Hold', desc: 'Retain oxygen with steady focus', voice: 'Hold breath for four seconds.', color: '#7c3aed' },
    { name: 'Bottom: Exhale', desc: 'Exhale smoothly and evenly', voice: 'Exhale smoothly for four seconds.', color: '#06b6d4' },
    { name: 'Left: Rest', desc: 'Rest empty in the quiet pause', voice: 'Rest empty for four seconds.', color: '#2563eb' }
  ];

  const currentSide = sides[sideIndex];

  useEffect(() => {
    let timer: any = null;
    if (isPlaying && !isCompleted) {
      timer = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            const nextSide = (sideIndex + 1) % 4;
            if (nextSide === 0) {
              setCompletedBoxes((b) => {
                const nextB = b + 1;
                if (nextB >= 4) {
                  setIsPlaying(false);
                  setIsCompleted(true);
                  audioEngine.playSfx('celebration_chords');
                  audioEngine.speak('Box breathing drill complete. Nervous system balanced.');
                  if (onComplete) onComplete({ completedBoxes: nextB });
                }
                return nextB;
              });
            }
            setSideIndex(nextSide);
            if (nextSide === 0) audioEngine.playSfx('inhale_whoosh');
            else if (nextSide === 2) audioEngine.playSfx('exhale_whoosh');
            else audioEngine.playSfx('sonar_ping');
            if (voiceEnabled) audioEngine.speak(sides[nextSide].voice);
            return 4;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, sideIndex, isCompleted, voiceEnabled, onComplete]);

  const handleToggle = () => {
    audioEngine.playSfx('tactile_tap');
    if (!isPlaying) {
      audioEngine.playSfx('inhale_whoosh');
      if (voiceEnabled) audioEngine.speak(currentSide.voice);
    } else {
      audioEngine.stopSpeaking();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    audioEngine.stopSpeaking();
    setIsPlaying(false);
    setSideIndex(0);
    setSecondsLeft(4);
    setCompletedBoxes(0);
    setIsCompleted(false);
  };

  return (
    <div className="w-full rounded-3xl bg-white p-6 sm:p-8 text-slate-800 shadow-xl shadow-indigo-500/5 border border-slate-100 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-600 shadow-sm">
            <Square className="w-6 h-6" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              ACT-02 • 4x4 TACTICAL BOX MATRIX
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {activityName || 'Box Breathing'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Navy SEAL 4-4-4-4 Autonomic Nervous System Equalization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              voiceEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{voiceEnabled ? 'Voice ON' : 'Voice OFF'}</span>
          </button>
          <button onClick={handleReset} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 text-xs transition-all cursor-pointer">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isCompleted ? (
        <div className="max-w-md mx-auto text-center space-y-6 relative z-10 py-2">
          {/* Unique Tactical 4-Sided Square HUD */}
          <div className="relative w-64 h-64 mx-auto p-4 flex items-center justify-center">
            {/* Box Borders with Active Side Highlight */}
            <div className="relative w-52 h-52 rounded-2xl border-4 border-slate-200 flex items-center justify-center bg-slate-50/50">
              {/* Top Side (Inhale) */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-xl transition-all duration-300 ${sideIndex === 0 && isPlaying ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.8)]' : 'bg-transparent'}`} />
              {/* Right Side (Hold) */}
              <div className={`absolute top-0 right-0 bottom-0 w-1.5 rounded-r-xl transition-all duration-300 ${sideIndex === 1 && isPlaying ? 'bg-purple-600 shadow-[0_0_15px_rgba(124,58,237,0.8)]' : 'bg-transparent'}`} />
              {/* Bottom Side (Exhale) */}
              <div className={`absolute bottom-0 left-0 right-0 h-1.5 rounded-b-xl transition-all duration-300 ${sideIndex === 2 && isPlaying ? 'bg-cyan-600 shadow-[0_0_15px_rgba(6,182,212,0.8)]' : 'bg-transparent'}`} />
              {/* Left Side (Hold) */}
              <div className={`absolute top-0 left-0 bottom-0 w-1.5 rounded-l-xl transition-all duration-300 ${sideIndex === 3 && isPlaying ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]' : 'bg-transparent'}`} />

              {/* Central Tactical Core */}
              <div className="text-center space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800">
                  {isPlaying ? currentSide.name.split(':')[1].trim() : 'Tactical Lock'}
                </span>
                <div className="text-5xl font-black text-slate-900 tracking-tighter">
                  {isPlaying ? `${secondsLeft}s` : '4x4'}
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {isPlaying ? `Side ${sideIndex + 1} of 4` : 'Press Start'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center space-y-1">
            <div className="text-[10px] uppercase font-black tracking-wider text-indigo-700">Tactical Directives</div>
            <p className="text-xs sm:text-sm font-bold text-slate-800">{isPlaying ? currentSide.desc : 'Maintain straight posture, uncross legs, and synchronize with the square perimeter.'}</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleToggle}
              className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all mx-auto cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'Pause Box Routine' : 'Start Box Breathing'}
            </button>

            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Completed Boxes: {completedBoxes} / 4</span>
              <span className="text-indigo-600 font-black">{Math.round((completedBoxes / 4) * 100)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-fade-in relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-indigo-50 border border-indigo-100 p-1 mx-auto shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center text-indigo-600">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Autonomic Equilibrium Locked</h3>
            <p className="text-xs text-slate-600 mt-1">
              Four square breathing cycles executed. Cortisol suppressed and situational clarity restored.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Execute Another Box
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-03: 4-7-8 SOMATIC TRANQUILIZER (Ocean Tidal Surge)
   ───────────────────────────────────────────────────────────── */
function OceanWave478Player({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [phase, setPhase] = useState<'inhale' | 'lock' | 'whoosh'>('inhale');
  const [secsLeft, setSecsLeft] = useState<number>(4);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  useEffect(() => {
    let timer: any = null;
    if (isPlaying && !isCompleted) {
      timer = setInterval(() => {
        setSecsLeft((s) => {
          if (s <= 1) {
            if (phase === 'inhale') {
              setPhase('lock');
              audioEngine.playSfx('singing_bowl');
              if (voiceEnabled) audioEngine.speak('Hold your breath for seven seconds.');
              return 7;
            } else if (phase === 'lock') {
              setPhase('whoosh');
              audioEngine.playSfx('exhale_whoosh');
              if (voiceEnabled) audioEngine.speak('Whoosh exhale completely for eight seconds.');
              return 8;
            } else {
              setPhase('inhale');
              audioEngine.playSfx('inhale_whoosh');
              if (voiceEnabled) audioEngine.speak('Inhale quietly through nose for four seconds.');
              setCompletedCycles((c) => {
                const nextC = c + 1;
                if (nextC >= 4) {
                  setIsPlaying(false);
                  setIsCompleted(true);
                  audioEngine.playSfx('celebration_chords');
                  audioEngine.speak('4-7-8 sedative cycle complete. Deep tranquility activated.');
                  if (onComplete) onComplete({ completedCycles: nextC });
                }
                return nextC;
              });
              return 4;
            }
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, phase, isCompleted, voiceEnabled, onComplete]);

  const handleToggle = () => {
    audioEngine.playSfx('tactile_tap');
    if (!isPlaying) {
      audioEngine.playSfx('inhale_whoosh');
      if (voiceEnabled) audioEngine.speak('Inhale quietly through your nose for four seconds.');
    } else {
      audioEngine.stopSpeaking();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    audioEngine.stopSpeaking();
    setIsPlaying(false);
    setPhase('inhale');
    setSecsLeft(4);
    setCompletedCycles(0);
    setIsCompleted(false);
  };

  return (
    <div className="w-full rounded-3xl bg-white p-6 sm:p-8 text-slate-800 shadow-xl shadow-teal-500/5 border border-slate-100 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-teal-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-teal-50 rounded-2xl border border-teal-100 text-teal-600 shadow-sm">
            <Waves className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
              ACT-03 • 4-7-8 RAPID SEDATIVE
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {activityName || '4-7-8 Breathing'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              4s Inhale • 7s Oxygen Lock • 8s Extended Whoosh Exhale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              voiceEnabled ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{voiceEnabled ? 'Voice ON' : 'Voice OFF'}</span>
          </button>
          <button onClick={handleReset} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 text-xs transition-all cursor-pointer">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isCompleted ? (
        <div className="max-w-md mx-auto text-center space-y-6 relative z-10 py-2">
          {/* Tidal Surge Liquid Bar */}
          <div className="relative w-64 h-64 mx-auto rounded-full bg-slate-50 border-2 border-teal-200 overflow-hidden flex flex-col items-center justify-center p-4 shadow-inner">
            <div
              className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-in-out ${
                phase === 'inhale'
                  ? 'bg-gradient-to-t from-teal-500 to-cyan-400 opacity-60'
                  : phase === 'lock'
                  ? 'bg-gradient-to-t from-indigo-500 to-purple-400 opacity-80'
                  : 'bg-gradient-to-t from-emerald-500 to-teal-300 opacity-40'
              }`}
              style={{
                height: phase === 'inhale' ? '70%' : phase === 'lock' ? '95%' : '20%'
              }}
            />

            <div className="relative z-10 text-center space-y-1">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 text-slate-900 shadow-sm">
                {phase === 'inhale' ? '1. Quiet Inhale' : phase === 'lock' ? '2. Oxygen Lock' : '3. Whoosh Exhale'}
              </span>
              <div className="text-5xl font-black text-slate-900 tracking-tighter drop-shadow-sm">
                {isPlaying ? `${secsLeft}s` : '4-7-8'}
              </div>
              <span className="text-[10px] font-bold text-slate-600 uppercase">
                {phase === 'inhale' ? 'Target: 4s' : phase === 'lock' ? 'Target: 7s' : 'Target: 8s'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 text-center space-y-1">
            <div className="text-[10px] uppercase font-black tracking-wider text-teal-700">Clinical Ratio Guidance</div>
            <p className="text-xs sm:text-sm font-bold text-slate-800">
              {phase === 'inhale' && 'Inhale quietly through your nose with tongue touching roof of mouth.'}
              {phase === 'lock' && 'Retain oxygen fully. Allow carbon dioxide exchange in brain capillary beds.'}
              {phase === 'whoosh' && 'Make an audible whoosh sound through your mouth, completely emptying lungs.'}
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleToggle}
              className="px-10 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-teal-500/25 transition-all mx-auto cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'Pause 4-7-8 Wave' : 'Start 4-7-8 Tranquilizer'}
            </button>

            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Completed Sets: {completedCycles} / 4</span>
              <span className="text-teal-700 font-black">{Math.round((completedCycles / 4) * 100)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-fade-in relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-teal-50 border border-teal-100 p-1 mx-auto shadow-lg shadow-teal-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center text-teal-600">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Neural Sedation Achieved</h3>
            <p className="text-xs text-slate-600 mt-1">
              Four complete 4-7-8 cycles finished. Sympathetic surge deactivated and heart rate lowered.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Repeat Tranquilizer
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-04: ALTERNATE NOSTRIL HEMISPHERIC SYNAPSE (Left/Right Bridge)
   ───────────────────────────────────────────────────────────── */
function AlternateNostrilHemisphericPlayer({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [secsLeft, setSecsLeft] = useState<number>(4);
  const [completedRounds, setCompletedRounds] = useState<number>(0);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const nostrilSteps = [
    { nostril: 'Left', action: 'Inhale', holdSecs: 4, handCue: 'Block Right Nostril with Thumb -> Inhale Left', voice: 'Block right nostril, inhale left.', color: '#06b6d4' },
    { nostril: 'Both', action: 'Hold', holdSecs: 2, handCue: 'Close Both Nostrils softly -> Pause in stillness', voice: 'Hold both nostrils closed.', color: '#7c3aed' },
    { nostril: 'Right', action: 'Exhale', holdSecs: 4, handCue: 'Release Right Nostril -> Exhale completely Right', voice: 'Open right nostril, exhale.', color: '#d97706' },
    { nostril: 'Right', action: 'Inhale', holdSecs: 4, handCue: 'Keep Right open -> Inhale smoothly Right', voice: 'Inhale through right nostril.', color: '#d97706' },
    { nostril: 'Both', action: 'Hold', holdSecs: 2, handCue: 'Close Both Nostrils softly -> Pause in stillness', voice: 'Hold gently.', color: '#7c3aed' },
    { nostril: 'Left', action: 'Exhale', holdSecs: 4, handCue: 'Release Left Nostril -> Exhale completely Left', voice: 'Open left nostril and exhale completely.', color: '#06b6d4' }
  ];

  const currentStep = nostrilSteps[stepIdx];

  useEffect(() => {
    let timer: any = null;
    if (isPlaying && !isCompleted) {
      timer = setInterval(() => {
        setSecsLeft((s) => {
          if (s <= 1) {
            const nextIdx = (stepIdx + 1) % nostrilSteps.length;
            if (nextIdx === 0) {
              setCompletedRounds((r) => {
                const nextR = r + 1;
                if (nextR >= 3) {
                  setIsPlaying(false);
                  setIsCompleted(true);
                  audioEngine.playSfx('celebration_chords');
                  audioEngine.speak('Alternate nostril breathing complete. Hemispheric equilibrium restored.');
                  if (onComplete) onComplete({ completedRounds: nextR });
                }
                return nextR;
              });
            }
            setStepIdx(nextIdx);
            const nextS = nostrilSteps[nextIdx];
            if (nextS.action === 'Inhale') audioEngine.playSfx('inhale_whoosh');
            else if (nextS.action === 'Exhale') audioEngine.playSfx('exhale_whoosh');
            else audioEngine.playSfx('singing_bowl');
            if (voiceEnabled) audioEngine.speak(nextS.voice);
            return nextS.holdSecs;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, stepIdx, isCompleted, voiceEnabled, onComplete]);

  const handleToggle = () => {
    audioEngine.playSfx('tactile_tap');
    if (!isPlaying) {
      audioEngine.playSfx('inhale_whoosh');
      if (voiceEnabled) audioEngine.speak(currentStep.voice);
    } else {
      audioEngine.stopSpeaking();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    audioEngine.stopSpeaking();
    setIsPlaying(false);
    setStepIdx(0);
    setSecsLeft(4);
    setCompletedRounds(0);
    setIsCompleted(false);
  };

  return (
    <div className="w-full rounded-3xl bg-white p-6 sm:p-8 text-slate-800 shadow-xl shadow-amber-500/5 border border-slate-100 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-amber-600 shadow-sm">
            <ArrowRightLeft className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
              ACT-04 • NADI SHODHANA HARMONIZER
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {activityName || 'Alternate Nostril Breathing'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Left & Right Hemispheric Brainwave Balance Sequence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              voiceEnabled ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{voiceEnabled ? 'Voice ON' : 'Voice OFF'}</span>
          </button>
          <button onClick={handleReset} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 text-xs transition-all cursor-pointer">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isCompleted ? (
        <div className="max-w-md mx-auto text-center space-y-6 relative z-10 py-2">
          {/* Left / Right Brain Channel HUD */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left Channel */}
            <div className={`p-4 rounded-2xl border-2 transition-all duration-500 text-center ${
              currentStep.nostril === 'Left' || currentStep.nostril === 'Both'
                ? 'bg-cyan-50/80 border-cyan-500 shadow-md shadow-cyan-500/10 ring-2 ring-cyan-200'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="text-[10px] font-black uppercase tracking-wider text-cyan-700">Left Channel (Moon / Ida)</div>
              <div className="text-lg font-black text-slate-900 mt-1">Left Nostril</div>
              <div className="text-xs font-bold text-cyan-600 mt-0.5">
                {currentStep.nostril === 'Left' ? `Active: ${currentStep.action}` : currentStep.nostril === 'Both' ? 'Closed (Hold)' : 'Resting'}
              </div>
            </div>

            {/* Right Channel */}
            <div className={`p-4 rounded-2xl border-2 transition-all duration-500 text-center ${
              currentStep.nostril === 'Right' || currentStep.nostril === 'Both'
                ? 'bg-amber-50/80 border-amber-500 shadow-md shadow-amber-500/10 ring-2 ring-amber-200'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Right Channel (Sun / Pingala)</div>
              <div className="text-lg font-black text-slate-900 mt-1">Right Nostril</div>
              <div className="text-xs font-bold text-amber-600 mt-0.5">
                {currentStep.nostril === 'Right' ? `Active: ${currentStep.action}` : currentStep.nostril === 'Both' ? 'Closed (Hold)' : 'Resting'}
              </div>
            </div>
          </div>

          {/* Center Timer Orb */}
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-amber-500 via-purple-500 to-cyan-400 p-1 mx-auto shadow-xl shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-900">{isPlaying ? secsLeft : 'Start'}</span>
              <span className="text-[9px] font-extrabold uppercase text-slate-400">
                {isPlaying ? `${currentStep.action}` : 'Ready'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-center space-y-1">
            <div className="text-[10px] uppercase font-black tracking-wider text-amber-800">Hand Mudra Position</div>
            <p className="text-xs sm:text-sm font-bold text-slate-800">{isPlaying ? currentStep.handCue : 'Use right thumb on right nostril and ring finger on left nostril.'}</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleToggle}
              className="px-10 py-4 bg-gradient-to-r from-amber-600 to-cyan-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all mx-auto cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'Pause Alternate Flow' : 'Begin Nadi Shodhana'}
            </button>

            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Completed Rounds: {completedRounds} / 3</span>
              <span className="text-amber-700 font-black">{Math.round((completedRounds / 3) * 100)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-fade-in relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-amber-50 border border-amber-100 p-1 mx-auto shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center text-amber-600">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Hemispheric Harmony Restored</h3>
            <p className="text-xs text-slate-600 mt-1">
              Synchronized airflow across both cerebral hemispheres, dispelling cognitive fatigue and restoring calm.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Practice Again
          </button>
        </div>
      )}
    </div>
  );
}

export default MoodLiftBreathingPlayer;
