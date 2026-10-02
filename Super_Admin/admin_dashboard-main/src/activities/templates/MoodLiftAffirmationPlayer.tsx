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
    <div className="w-full rounded-3xl bg-white p-6 sm:p-8 text-slate-800 shadow-xl shadow-purple-500/5 border border-slate-100 relative overflow-hidden font-['Plus_Jakarta_Sans']">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-fuchsia-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#5e2be2]/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-fuchsia-50 rounded-2xl border border-fuchsia-100 text-fuchsia-600 shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse text-fuchsia-500" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">
              ACT-11 • NEUROPLASTICITY MIRROR
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {activityName || 'Affirmation Mirror'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Reinforce positive self-worth pathways via deliberate mirror neuro-linguistic reframing.
            </p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs transition-all cursor-pointer">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!isCompleted ? (
        <div className="max-w-xl mx-auto space-y-6 text-center relative z-10">
          <div className="flex justify-between text-xs font-bold text-fuchsia-700">
            <span>Neural Mirror Reflection {currentIdx + 1} of {affirmationsList.length}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-[10px] font-black text-fuchsia-700">
              {currentAffirmation.domain}
            </span>
          </div>

          {/* Holographic Mirror Box */}
          <div className="relative p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-purple-50/60 to-fuchsia-50/40 border-2 border-purple-200 backdrop-blur-xl shadow-lg shadow-purple-500/5 space-y-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#5e2be2] flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Speak Aloud or Absorb Internally
            </div>

            <p className="text-xl sm:text-2xl font-black text-slate-900 leading-relaxed my-4 tracking-wide">
              "{currentAffirmation.text}"
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={speakCurrentAffirmation}
                className="px-4 py-1.5 rounded-full bg-white hover:bg-purple-50 border border-purple-200 flex items-center gap-1.5 text-xs font-bold text-[#5e2be2] transition-all cursor-pointer shadow-sm"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hear Voice Guide</span>
              </button>

              <div className="px-4 py-1.5 rounded-full bg-white border border-purple-200 flex items-center gap-2 text-xs font-bold text-[#5e2be2] shadow-sm">
                <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-ping" />
                <span>Integration Timer: {reflectionTimer}s</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={handleNext}
              className="px-10 py-4 bg-gradient-to-r from-fuchsia-600 to-[#5e2be2] hover:opacity-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-fuchsia-500/20 transition-all cursor-pointer"
            >
              {currentIdx === affirmationsList.length - 1 ? 'Integrate Affirmation Protocol' : 'Next Mirror Reflection'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-fade-in relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-fuchsia-500 to-[#5e2be2] p-1 mx-auto shadow-lg shadow-fuchsia-500/30 flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center text-fuchsia-600">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">Neuro-Affirmation Grounded</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Reinforced 5 core self-worth circuits in your prefrontal cortex.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Practice Mirror Work Again
          </button>
        </div>
      )}
    </div>
  );
};

export default MoodLiftAffirmationPlayer;
