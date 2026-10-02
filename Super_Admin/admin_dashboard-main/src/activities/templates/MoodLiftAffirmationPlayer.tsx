import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RotateCcw,
  ArrowRight,
  Zap,
  CheckCircle2,
  Volume2
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';
import { audioEngine } from '../utils/therapeuticAudioEngine';

export const MoodLiftAffirmationPlayer: React.FC<BaseActivityComponentProps> = ({
  activityName,
  onComplete
}) => {
  const affirmationsList = [
    { text: 'I am inherently worthy, safe, and capable of navigating this day with grounded confidence.', domain: 'SELF-WORTH & SAFETY', color: '#ec4899' },
    { text: 'My value is not measured by relentless productivity. I am allowed to rest, pause, and breathe.', domain: 'PERMISSION & PEACE', color: '#8b5cf6' },
    { text: 'I have moved through intense storms before. I possess the resilience to handle whatever unfolds.', domain: 'NEURAL RESILIENCE', color: '#06b6d4' },
    { text: 'I release responsibility for things outside my direct control and protect my inner peace.', domain: 'BOUNDARY RESTORATION', color: '#f59e0b' },
    { text: 'I treat my mind and physical body with unconditional compassion and gentleness today.', domain: 'SELF-COMPASSION', color: '#10b981' }
  ];

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [reflectionTimer, setReflectionTimer] = useState<number>(20);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const currentAffirmation = affirmationsList[currentIdx];

  useEffect(() => {
    let timer: any = null;
    if (isActive && reflectionTimer > 0) {
      timer = setInterval(() => setReflectionTimer((t) => t - 1), 1000);
    } else if (isActive && reflectionTimer === 0) {
      setIsActive(false);
    }
    return () => clearInterval(timer);
  }, [isActive, reflectionTimer]);

  const speakCurrentAffirmation = () => {
    audioEngine.playSfx('neural_sparkle');
    audioEngine.speak(currentAffirmation.text);
  };

  const handleNext = () => {
    audioEngine.playSfx('sonar_ping');
    if (currentIdx < affirmationsList.length - 1) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      setReflectionTimer(20);
      setIsActive(true);
      audioEngine.speak(affirmationsList[next].text);
    } else {
      setIsCompleted(true);
      audioEngine.playSfx('celebration_chords');
      audioEngine.speak('Neural mirror affirmation integrated into your self-concept.');
      if (onComplete) onComplete({ completedAffirmations: affirmationsList.length });
    }
  };

  const handleReset = () => {
    audioEngine.playSfx('tactile_tap');
    setCurrentIdx(0);
    setReflectionTimer(20);
    setIsActive(true);
    setIsCompleted(false);
  };

  return (
    <div className="w-full rounded-3xl bg-[#090615] p-6 sm:p-8 text-white shadow-2xl border border-purple-500/20 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-fuchsia-600/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#5e2be2]/20 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-fuchsia-500/10 rounded-2xl border border-fuchsia-500/30 text-fuchsia-300 shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse text-fuchsia-400" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
              ACT-11 • NEUROPLASTICITY MIRROR
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
              {activityName || 'Affirmation Mirror'}
            </h2>
            <p className="text-xs text-purple-200/80 font-semibold mt-0.5">
              Reinforce positive self-worth pathways via deliberate mirror neuro-linguistic reframing.
            </p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-white/5 hover:bg-white/15 text-white rounded-xl text-xs transition-all cursor-pointer">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!isCompleted ? (
        <div className="max-w-xl mx-auto space-y-6 text-center relative z-10">
          <div className="flex justify-between text-xs font-bold text-fuchsia-300">
            <span>Neural Mirror Reflection {currentIdx + 1} of {affirmationsList.length}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-[10px] font-black">
              {currentAffirmation.domain}
            </span>
          </div>

          {/* Holographic Mirror Box */}
          <div className="relative p-8 sm:p-10 rounded-3xl bg-slate-950/80 border-2 border-fuchsia-500/40 backdrop-blur-2xl shadow-[0_0_50px_rgba(217,70,239,0.25)] space-y-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400/80 flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-300" /> Speak Aloud or Absorb Internally
            </div>

            <p className="text-xl sm:text-2xl font-black text-white leading-relaxed my-4 tracking-wide drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              "{currentAffirmation.text}"
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={speakCurrentAffirmation}
                className="px-4 py-1.5 rounded-full bg-purple-900/40 hover:bg-purple-900/60 border border-fuchsia-500/30 flex items-center gap-1.5 text-xs font-bold text-fuchsia-300 transition-all cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hear Voice Guide</span>
              </button>

              <div className="px-4 py-1.5 rounded-full bg-purple-950/60 border border-fuchsia-500/30 flex items-center gap-2 text-xs font-bold text-fuchsia-300">
                <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-ping" />
                <span>Integration Timer: {reflectionTimer}s</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={handleNext}
              className="px-10 py-4 bg-gradient-to-r from-fuchsia-500 to-[#5e2be2] hover:opacity-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-[0_0_35px_rgba(217,70,239,0.4)] transition-all cursor-pointer"
            >
              {currentIdx === affirmationsList.length - 1 ? 'Integrate Affirmation Protocol' : 'Next Mirror Reflection'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-fade-in relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-fuchsia-500 to-[#5e2be2] p-1 mx-auto shadow-[0_0_50px_rgba(217,70,239,0.5)] flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-slate-950/80 flex items-center justify-center text-fuchsia-300">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">Neuro-Affirmation Grounded</h3>
            <p className="text-xs sm:text-sm text-purple-200/80 mt-1">
              Reinforced 5 core self-worth circuits in your prefrontal cortex.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Practice Mirror Work Again
          </button>
        </div>
      )}
    </div>
  );
};

export default MoodLiftAffirmationPlayer;
