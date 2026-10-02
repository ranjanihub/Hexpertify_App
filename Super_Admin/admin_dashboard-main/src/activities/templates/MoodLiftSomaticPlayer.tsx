import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Heart,
  Volume2,
  Coffee,
  Eye,
  Hand,
  Check
} from 'lucide-react';
import type { BaseActivityComponentProps } from '../types';

export const MoodLiftSomaticPlayer: React.FC<BaseActivityComponentProps> = ({
  activityId = 'ACT-08',
  activityName,
  onComplete
}) => {
  if (activityId === 'ACT-08') {
    return <PostureResetGame activityName={activityName} onComplete={onComplete} />;
  } else {
    return <SelfSoothingGame activityName={activityName} onComplete={onComplete} />;
  }
};

/* ─────────────────────────────────────────────────────────────
   ACT-08: POSTURE RESET (Biomechanical Alignment & De-stress)
   ───────────────────────────────────────────────────────────── */
function PostureResetGame({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const steps = [
    { title: 'Plant Feet Solidly', desc: 'Place both feet completely flat on the floor, uncrossing legs and feeling gravity ground your weight.', holdSeconds: 15 },
    { title: 'Roll Shoulders Up, Back & Down', desc: 'Inhale while lifting shoulders to ears, then exhale deeply as you roll them back and drop shoulder blades into your back pockets.', holdSeconds: 20 },
    { title: 'Lengthen Spine & Neutralize Chin', desc: 'Imagine a string pulling the crown of your head upward. Tuck chin slightly to decompress the cervical vertebrae.', holdSeconds: 20 },
    { title: 'Full Diaphragmatic Chest Opener', desc: 'Place hands on lower ribs. Take a deep, expansive inhale opening the heart center, then sigh out the breath.', holdSeconds: 25 }
  ];

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(steps[0].holdSeconds);
  const [isActive, setIsActive] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => setSecondsRemaining((s) => s - 1), 1000);
    } else if (isActive && secondsRemaining === 0) {
      if (currentStepIdx < steps.length - 1) {
        const nextIdx = currentStepIdx + 1;
        setCurrentStepIdx(nextIdx);
        setSecondsRemaining(steps[nextIdx].holdSeconds);
      } else {
        setIsActive(false);
        setCompleted(true);
        if (onComplete) onComplete({ completed: true });
      }
    }
    return () => clearInterval(interval);
  }, [isActive, secondsRemaining, currentStepIdx, steps, onComplete]);

  const handleStart = () => {
    setIsActive(true);
  };

  const handleReset = () => {
    setIsActive(false);
    setCurrentStepIdx(0);
    setSecondsRemaining(steps[0].holdSeconds);
    setCompleted(false);
  };

  const currentStep = steps[currentStepIdx];

  return (
    <div className="w-full rounded-3xl bg-gradient-to-b from-slate-900 via-zinc-950 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-white/10 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/15 text-emerald-400">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              ACT-08 • BIOMECHANICAL POSTURE RESET
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">{activityName || 'Posture Reset'}</h2>
            <p className="text-xs text-white/70">Realign posture to relieve musculoskeletal tension and stimulate confident calm.</p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!completed ? (
        <div className="max-md mx-auto text-center space-y-6">
          <div className="flex justify-between text-xs font-bold text-emerald-300">
            <span>Alignment Phase {currentStepIdx + 1} of 4</span>
            <span>{secondsRemaining}s Hold</span>
          </div>

          <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-3">
            <div className="text-xl font-black text-white">{currentStep.title}</div>
            <p className="text-xs text-white/70 leading-relaxed">{currentStep.desc}</p>

            <div className="py-4">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-400/50 flex items-center justify-center mx-auto text-3xl font-black shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                {secondsRemaining}s
              </div>
            </div>
          </div>

          {!isActive ? (
            <button
              onClick={handleStart}
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/30 transition-all mx-auto"
            >
              Begin Posture Alignment Sequence
            </button>
          ) : (
            <div className="text-xs text-white/60 font-semibold animate-pulse">
              Hold alignment and breathe naturally...
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 space-y-5 max-w-md mx-auto animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">Posture & Energy Restored!</h3>
            <p className="text-xs text-white/70 mt-1">
              Your chest is open, spine is decompressed, and breathing capacity is fully unlocked.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
          >
            Reset Sequence
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACT-09: SELF-SOOTHING (DBT 5-Sense Distress Tolerance Kit)
   ───────────────────────────────────────────────────────────── */
function SelfSoothingGame({ activityName, onComplete }: { activityName?: string; onComplete?: any }) {
  const selectedItems = {
    sight: 'Warm sunlight / green plant',
    sound: 'Gentle ambient rain or acoustic tones',
    touch: 'Soft plush blanket or cool stone',
    smell: 'Calming lavender / fresh coffee aroma',
    taste: 'Warm herbal tea or mint'
  };

  const [checkedSenses, setCheckedSenses] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  const senses = [
    { key: 'sight', label: 'Vision / Sight', icon: Eye, color: 'text-amber-400', default: 'Warm sunlight or pleasing art' },
    { key: 'sound', label: 'Sound / Hearing', icon: Volume2, color: 'text-blue-400', default: 'Gentle ambient lo-fi / rain tones' },
    { key: 'touch', label: 'Tactile Touch', icon: Hand, color: 'text-purple-400', default: 'Comfortable textured fabric / cool water' },
    { key: 'smell', label: 'Aroma / Smell', icon: Sparkles, color: 'text-rose-400', default: 'Lavender / citrus / fresh laundry' },
    { key: 'taste', label: 'Taste / Savor', icon: Coffee, color: 'text-emerald-400', default: 'Mindful sip of warm chamomile or mint' }
  ];

  const toggleCheck = (key: string) => {
    if (checkedSenses.includes(key)) {
      setCheckedSenses(checkedSenses.filter((k) => k !== key));
    } else {
      const updated = [...checkedSenses, key];
      setCheckedSenses(updated);
      if (updated.length === senses.length) {
        setCompleted(true);
        if (onComplete) onComplete({ selectedItems });
      }
    }
  };

  const handleReset = () => {
    setCheckedSenses([]);
    setCompleted(false);
  };

  return (
    <div className="w-full rounded-3xl bg-gradient-to-b from-rose-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-rose-500/20 font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/20 rounded-2xl border border-rose-400/30 text-rose-300">
            <Heart className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-400/30">
              ACT-09 • DBT MULTI-SENSORY DISTRESS TOLERANCE
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">{activityName || 'Self-Soothing'}</h2>
            <p className="text-xs text-white/70">Activate your nervous system's innate comfort response through 5 sensory anchors.</p>
          </div>
        </div>
        <button onClick={handleReset} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!completed ? (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex justify-between text-xs font-bold text-rose-300">
            <span>Engage Each Sensory Element ({checkedSenses.length}/5)</span>
            <span>Tap checkbox when experienced</span>
          </div>

          <div className="space-y-3">
            {senses.map((s) => {
              const Icon = s.icon;
              const isChecked = checkedSenses.includes(s.key);
              return (
                <div
                  key={s.key}
                  onClick={() => toggleCheck(s.key)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isChecked
                      ? 'bg-rose-500/20 border-rose-400/50 shadow-md'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-white/10 ${s.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-white">{s.label}</div>
                      <div className="text-[11px] text-white/60 mt-0.5">{(selectedItems as any)[s.key] || s.default}</div>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                    isChecked ? 'bg-rose-500 border-rose-400 text-white' : 'border-white/30 bg-white/5'
                  }`}>
                    {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 space-y-5 max-w-md mx-auto animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-400/40 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">Full Sensory Comfort Achieved</h3>
            <p className="text-xs text-white/70 mt-1">
              All 5 somatic channels have been bathed in soothing signals, lowering cortisol and cultivating deep safety.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
          >
            Review Kit Again
          </button>
        </div>
      )}
    </div>
  );
}

export default MoodLiftSomaticPlayer;
