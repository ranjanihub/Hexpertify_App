import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Heart,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';

export const MoodLiftAffirmationPlayer: React.FC<BaseActivityComponentProps> = ({
  activityName,
  onComplete
}) => {
  const affirmationsList = [
    { text: 'I am safe, capable, and doing the best I can in this moment.', category: 'Safety & Calm' },
    { text: 'My worth is intrinsic and not defined by productivity or perfection.', category: 'Self-Worth' },
    { text: 'I have survived difficult days before, and I will navigate this one with grace.', category: 'Resilience' },
    { text: 'I release what I cannot control and invest my energy into my peace.', category: 'Boundary & Release' },
    { text: 'I treat my mind and body with unconditional compassion today.', category: 'Self-Love' }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [reflectionTimer, setReflectionTimer] = useState(20);
  const [isActive, setIsActive] = useState(false);
  const [selfWorthScore] = useState(8);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && reflectionTimer > 0) {
      interval = setInterval(() => setReflectionTimer((t) => t - 1), 1000);
    } else if (isActive && reflectionTimer === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, reflectionTimer]);

  const handleNext = () => {
    if (currentIndex < affirmationsList.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setReflectionTimer(20);
      setIsActive(true);
    } else {
      setCompleted(true);
      if (onComplete) onComplete({ selfWorthScore, completedAffirmations: affirmationsList.length });
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setReflectionTimer(20);
    setIsActive(false);
    setCompleted(false);
  };

  const currentAffirmation = affirmationsList[currentIndex];

  return (
    <div className="w-full rounded-3xl bg-gradient-to-b from-fuchsia-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-fuchsia-500/20 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-fuchsia-500/20 rounded-2xl border border-fuchsia-400/30 text-fuchsia-300">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/30">
              ACT-11 • NEUROPLASTICITY MIRROR WORK
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">{activityName || 'Affirmation Mirror'}</h2>
            <p className="text-xs text-white/70">Rewire self-referential neural pathways through deliberate compassionate mirror reflection.</p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!completed ? (
        <div className="max-w-xl mx-auto space-y-6 text-center">
          <div className="flex justify-between text-xs font-bold text-fuchsia-300">
            <span>Affirmation {currentIndex + 1} of {affirmationsList.length}</span>
            <span>Category: {currentAffirmation.category}</span>
          </div>

          {/* Mirror Frame Aesthetic */}
          <div className="relative p-8 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border-2 border-fuchsia-400/40 backdrop-blur-xl shadow-[0_0_50px_rgba(217,70,239,0.2)]">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-fuchsia-300">
              Speak Aloud / Internalize Gaze
            </div>

            <p className="text-lg sm:text-2xl font-black text-white leading-relaxed my-6 tracking-wide">
              "{currentAffirmation.text}"
            </p>

            <div className="flex items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/30 flex items-center justify-center font-bold text-xs">
                {reflectionTimer}s
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={handleNext}
              className="px-8 py-3.5 bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-xl shadow-fuchsia-500/30 transition-all"
            >
              {currentIndex === affirmationsList.length - 1 ? 'Complete Reflection' : 'Next Affirmation'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 space-y-5 max-w-md mx-auto animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">Neural Affirmation Integrated</h3>
            <p className="text-xs text-white/70 mt-1">
              You've reinforced positive self-worth pathways across 5 core domains.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
          >
            Practice Mirror Work Again
          </button>
        </div>
      )}
    </div>
  );
};

export default MoodLiftAffirmationPlayer;
